#!/bin/bash

#########################
## Validate deployment ##
#########################

RELEASE=$1

if [[ $RELEASE != "major" && $RELEASE != "minor" && $RELEASE != "patch" && $RELEASE != "prerelease" ]]; then
  echo "Unknown release type $RELEASE. Valid values are major, minor, patch, prerelease. Aborting."
  exit 1
fi

if [[ ! -z "$(git status --untracked-files=no --porcelain)" ]]; then
  echo "Can not deploy from branch with uncommitted changes. Commit changes and try again. Aborting."
  exit 1
fi

CURRENT=$(git rev-parse --abbrev-ref HEAD)

if [[ $CURRENT != "master" ]]; then
  echo 'Can not deploy from non-master branch. Merge changes to master and try again. Aborting.'
  exit 1
fi

REMOTE=$(git rev-parse --abbrev-ref origin/master)
git fetch

if [[ $(git rev-list --count HEAD..origin/master) -ne 0 ]]; then
  echo "Can not deploy when local master branch is behind remote. Run 'git pull' to update local branch and try again. Aborting."
  exit 1
fi

read -p "Ready for $RELEASE deployment. Do you want to continue? (y/n): " RESPONSE

case $RESPONSE in
  y|Y)
    echo "Deploying...";;
  *)
    echo "Aborting deployment."; exit 1;;
esac

####################
## Run deployment ##
####################

npm run build

if [[ $RELEASE -eq "prerelease" ]]; then
  npm version prerelease --preid rc
  git push --follow-tags
  cp package* README.md LICENSE dist/
  npm publish dist/ --tag next
else
  npm version $RELEASE
  git push --follow-tags
  cp package* README.md LICENSE dist/
  npm publish dist/
fi

echo "Deploy to NPM Succeeded"
