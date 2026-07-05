{ pkgs ? import <nixpkgs> { } }:
with pkgs;
let
  dfx-env = import (fetchTarball
    "https://github.com/ninegua/ic-nix/releases//download/20260515/dfx-env.tar.gz")
    { };
  xclip = writeShellScriptBin "xclip" ''
    exec ${wl-clipboard}/bin/wl-copy "$@"
  '';
in dfx-env.overrideAttrs (old: {
  # disable icp-cli telemetry
  DO_NOT_TRACK = 1;
  DFX_WARNING = "-mainnet_plaintext_identity";
  buildInputs = old.buildInputs
    ++ [ nodejs typescript prettier webpack-cli pnpm imagemagick xclip ];
})
