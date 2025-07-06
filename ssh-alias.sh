#!/bin/sh


echo "Starting ssh-alias.sh"
if [ -z "$SSH_KEY" ]; then
    echo "SSH_KEY environment variable not set"
    exit 0
fi

echo "SSH_KEY environment variable set"

mkdir -p ~/.ssh
echo "$SSH_KEY" > ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519

echo $(ll ~/.ssh/)

# SSH alias for content repo
cat <<EOF > ~/.ssh/config
Host content.github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no
EOF

echo "SSH alias created"