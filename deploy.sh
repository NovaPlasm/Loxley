CYAN='\033[0;36m'
GREEN='\033[0;32m'
printf "${CYAN}Deploying current build to production!${GREEN}\n"
git push prod master