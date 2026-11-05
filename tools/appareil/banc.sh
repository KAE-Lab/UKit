#!/usr/bin/env bash
# Le banc Android du poste : un emulateur pilote sans fenetre, pour verifier un parcours sans
# telephone. Le build de developpement s'installe une fois ; le code arrive ensuite par Metro.
#
# Pourquoi un service systemd plafonne : l'emulateur pese 3,5 Go et ce poste a deja perdu ses
# sessions par manque de memoire. Dans son propre service, c'est lui que le noyau tue, pas le
# terminal. Un seul emulateur a la fois, pour la meme raison.
#
# Deux appareils : `ukit-a8` (Android 9, 1080x2220 a 480 dpi, le format et le systeme du Galaxy A8,
# avec son vieux magasin d'autorites) et `ukit` (Android 15, format Pixel 6).
#
#   tools/appareil/banc.sh demarrer [ukit-a8|ukit]   demarre l'emulateur, attend le boot, relie Metro
#   tools/appareil/banc.sh installer <fichier.apk>   installe le build de developpement
#   tools/appareil/banc.sh ouvrir                    ouvre l'application sur le Metro du poste (8081)
#   tools/appareil/banc.sh capture <fichier.png>     capture de l'ecran
#   tools/appareil/banc.sh theme clair|sombre       celui du systeme, que l'application ne lit qu'au
#                                                    premier lancement ; ensuite, son propre reglage
#   tools/appareil/banc.sh format a8|petit|defaut|<L>x<H> <dpi>
#   tools/appareil/banc.sh police <echelle>          1 par defaut, 1.3 pour une grande police
#   tools/appareil/banc.sh animations oui|non        non = « supprimer les animations » du systeme
#   tools/appareil/banc.sh reseau oui|non            coupe wifi et donnees ; Metro passe par adb
#   tools/appareil/banc.sh journal                   journal JavaScript et natif de l'application
#   tools/appareil/banc.sh arreter
#
# Metro se lance a part, depuis la racine du depot : `npx expo start --dev-client --port 8081`.

set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
ADB="$SDK/platform-tools/adb"
EMULATEUR="$SDK/emulator/emulator"
SERVICE="emulateur-ukit"
PAQUET="com.bordeaux1.emplois"
PORT_METRO=8081

erreur() { echo "banc: $*" >&2; exit 1; }

attendre_le_boot() {
	timeout 180 "$ADB" wait-for-device || erreur "aucun appareil apres 180 s"
	for _ in $(seq 1 90); do
		[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && return 0
		sleep 2
	done
	erreur "le systeme n'a pas fini de demarrer apres 180 s"
}

demarrer() {
	local avd="${1:-ukit-a8}"
	[ -d "$HOME/.android/avd/$avd.avd" ] || erreur "appareil virtuel inconnu : $avd"
	if systemctl --user is-active --quiet "$SERVICE"; then
		local actuel
		actuel=$("$ADB" emu avd name 2>/dev/null | head -1 | tr -d '\r')
		[ "$actuel" = "$avd" ] && { echo "$avd tourne deja"; relier; return; }
		arreter
	fi
	# Le rendu : ANGLE sur SwiftShader. SwiftShader en direct faisait tomber l'emulateur (SEGV) cinq
	# fois en une heure le 2026-11-05, sous des en-tetes a degrade ; ANGLE a tenu le meme essai.
	# BANC_GPU=swiftshader_indirect pour comparer.
	systemd-run --user --unit="$SERVICE" --collect \
		-p MemoryMax=4G -p MemorySwapMax=512M -p OOMPolicy=kill \
		--setenv=ANDROID_HOME="$SDK" \
		"$EMULATEUR" -avd "$avd" -no-window -no-audio -no-boot-anim \
		-gpu "${BANC_GPU:-swangle_indirect}" -no-snapshot-save >/dev/null
	attendre_le_boot
	franciser
	relier
	echo "$avd pret"
}

# La langue et le fuseau des deux appareils reels. Le fuseau compte : l'heure de Paris sous Hermes
# est un point de verification. Les images Google APIs acceptent `adb root` ; le redemarrage de
# zygote n'a lieu que la premiere fois, les proprietes persistent dans l'appareil virtuel.
franciser() {
	[ "$("$ADB" shell getprop persist.sys.locale | tr -d '\r')" = fr-FR ] && return 0
	"$ADB" root >/dev/null
	sleep 2
	"$ADB" wait-for-device
	"$ADB" shell "setprop persist.sys.locale fr-FR; setprop persist.sys.timezone Europe/Paris; setprop ctl.restart zygote"
	# sys.boot_completed reste a 1 pendant le redemarrage de zygote : on laisse le temps au systeme.
	sleep 25
	attendre_le_boot
}

# Metro joint par le tunnel d'adb, pas par le reseau de l'emulateur : couper ce reseau
# (`reseau non`) laisse donc le bundle arriver.
relier() { "$ADB" reverse tcp:$PORT_METRO tcp:$PORT_METRO >/dev/null; }

# `is-active` repond non des l'etat « en arret » : on attend que l'unite soit dechargee, sans quoi
# le demarrage suivant echoue sur un nom de service encore pris.
decharge() { [ "$(systemctl --user show "$SERVICE" -p LoadState --value)" != loaded ]; }

arreter() {
	"$ADB" emu kill >/dev/null 2>&1 || true
	for _ in $(seq 1 20); do
		decharge && { echo "emulateur arrete"; return 0; }
		sleep 1
	done
	systemctl --user stop "$SERVICE" 2>/dev/null || true
	systemctl --user reset-failed "$SERVICE" 2>/dev/null || true
	decharge || erreur "le service $SERVICE ne se decharge pas"
	echo "emulateur arrete (force)"
}

ouvrir() {
	relier
	"$ADB" shell am start -a android.intent.action.VIEW \
		-d "exp+ukit://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$PORT_METRO" \
		"$PAQUET" >/dev/null
}

format() {
	case "${1:-}" in
		a8) "$ADB" shell wm size 1080x2220; "$ADB" shell wm density 480 ;;
		# La taille physique de l'emulateur en cours.
		defaut) "$ADB" shell wm size reset; "$ADB" shell wm density reset ;;
		# 360x640 dp : le plus petit telephone encore courant.
		petit) "$ADB" shell wm size 720x1280; "$ADB" shell wm density 320 ;;
		*x*) [ -n "${2:-}" ] || erreur "format <L>x<H> <dpi>"
			"$ADB" shell wm size "$1"; "$ADB" shell wm density "$2" ;;
		*) erreur "format a8|petit|defaut|<L>x<H> <dpi>" ;;
	esac
}

animations() {
	local echelle
	case "${1:-}" in oui) echelle=1 ;; non) echelle=0 ;; *) erreur "animations oui|non" ;; esac
	for cle in animator_duration_scale transition_animation_scale window_animation_scale; do
		"$ADB" shell settings put global "$cle" "$echelle"
	done
}

reseau() {
	local etat
	case "${1:-}" in oui) etat=enable ;; non) etat=disable ;; *) erreur "reseau oui|non" ;; esac
	"$ADB" shell svc wifi "$etat"
	"$ADB" shell svc data "$etat"
}

commande="${1:-}"
shift || true
case "$commande" in
	demarrer) demarrer "$@" ;;
	arreter) arreter ;;
	installer) [ -f "${1:-}" ] || erreur "installer <fichier.apk>"; "$ADB" install -r "$1" ;;
	ouvrir) ouvrir ;;
	capture) [ -n "${1:-}" ] || erreur "capture <fichier.png>"; "$ADB" exec-out screencap -p > "$1" ;;
	theme)
		case "${1:-}" in
			clair) "$ADB" shell cmd uimode night no ;;
			sombre) "$ADB" shell cmd uimode night yes ;;
			*) erreur "theme clair|sombre" ;;
		esac ;;
	format) format "$@" ;;
	police) "$ADB" shell settings put system font_scale "${1:-1}" ;;
	animations) animations "$@" ;;
	reseau) reseau "$@" ;;
	journal) "$ADB" logcat -v time ReactNativeJS:V ReactNative:V AndroidRuntime:E '*:S' ;;
	*) sed -n '2,/^$/p' "$0"; exit 1 ;;
esac
