#!/bin/bash
# ==============================================================================
# Swap File Setup Script for 1GB RAM Linux VPS (Ubuntu/Debian)
# ==============================================================================

set -e

SWAP_SIZE="2G"

echo "Checking existing swap..."
swapon --show

if swapon --show | grep -q "swap"; then
    echo "Swap file already exists. Skipping creation."
    exit 0
fi

echo "Creating a ${SWAP_SIZE} swap file at /swapfile..."
fallocate -l ${SWAP_SIZE} /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048

chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Persist across reboots
if ! grep -q '/swapfile none swap sw 0 0' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Set optimal swappiness for low RAM VPS
sysctl vm.swappiness=20
if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=20' >> /etc/sysctl.conf
fi

echo "Swap configuration complete! Current memory status:"
free -h
