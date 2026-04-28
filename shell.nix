{ pkgs ? import <nixpkgs> { } }:
with pkgs;
let
  dfx-env = import (fetchTarball
    "https://github.com/ninegua/ic-nix/releases//download/20260426/dfx-env.tar.gz")
    { };
in dfx-env.overrideAttrs (old: {
  DFX_WARNING = "-mainnet_plaintext_identity";
  buildInputs = old.buildInputs
    ++ [ nodejs typescript prettier webpack-cli pnpm ];
})
