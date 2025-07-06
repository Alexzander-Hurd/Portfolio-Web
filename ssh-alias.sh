#!/bin/sh

if [ -z "$SSH_KEY" ]; then
    echo "SSH_KEY environment variable not set"
    exit 0
fi

mkdir -p ~/.ssh
echo "$SSH_KEY" > ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_ed25519

# SSH alias for content repo
cat <<EOF > ~/.ssh/config
Host content.github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no
EOF
