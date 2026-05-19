# The default hash is with nixpkgs unstable. Supply `pnpmDepsHash` if you want to pin nixpkgs.
{ pkgs ? import <nixpkgs> { }
, pnpmDepsHash ? "sha256-+qysXTGTj82hXKzWNOsTl9VArOgfWAccPb26/mYUf5s="
, version ? "0.0.1" }:
with pkgs;
let
  ic-nix = fetchFromGitHub {
    owner = "ninegua";
    repo = "ic-nix";
    rev = "20260515";
    sha256 = "sha256:0xslzm2jdsikmws9rz09wrdr9zy16wsj4mg945fpdxz3y6sc2dnz";
  };
  ic-pkgs = import "${ic-nix}/default.nix" { inherit pkgs; };
  moc = ic-pkgs.motoko.moc;
  motoko-core-version = "v2.5.0";
  motoko-core = fetchFromGitHub {
    owner = "caffeinelabs";
    repo = "motoko-core";
    rev = motoko-core-version;
    sha256 = "sha256-Tl7p+94UteAC1oaUo9cG+yp6HtlyrFGbATvOGwBn2Ro=";
  };
  backend = stdenv.mkDerivation {
    inherit version;
    pname = "kopicat-backend";
    src = lib.cleanSourceWith (rec {
      src = ./.;
      filter = path: type:
        let relPath = lib.removePrefix (toString src + "/") (toString path);
        in lib.any (prefix: lib.hasPrefix prefix relPath) [
          "backend"
          "Makefile"
          "vessel.dhall"
          "package-set.dhall"
        ];
    });
    nativeBuildInputs = with ic-pkgs; [ moc candid ];
    configurePhase = "mkdir .vessel";
    buildPhase = ''
      make backend MOC=${moc}/bin/moc MOTOKO_CORE="${motoko-core}"
    '';
    installPhase = ''
      mkdir -p $out
      cp -r build/* $out
    '';
  };
  frontend = stdenv.mkDerivation (finalAttrs: {
    inherit version;
    pname = "kopicat-frontend";
    src = lib.cleanSourceWith (rec {
      src = ./.;
      filter = path: type:
        let relPath = lib.removePrefix (toString src + "/") (toString path);
        in (lib.any (prefix: lib.hasPrefix prefix relPath) [
          "frontend"
          "assets"
          "static"
          "Makefile"
          "package.json"
          "pnpm-lock.yaml"
          "svelte.config.js"
          "tsconfig.json"
          "vite.config.js"
          "vitest.config.ts"
        ] || lib.hasPrefix relPath ".icp/data/mappings/ic.ids.json");
    });
    nativeBuildInputs = [ nodejs pnpm pnpmConfigHook imagemagick ];

    pnpmDeps = fetchPnpmDeps {
      inherit (finalAttrs) pname version src;
      fetcherVersion = 3;
      hash = pnpmDepsHash;
    };
    buildPhase = ''
      runHook preBuild
      ln -s ${backend} build
      make frontend
      runHook postBuild
    '';
    checkPhase = ''
      pnpm check
      pnpm test
    '';
    installPhase = "cp -r dist $out";
    doCheck = true;
  });

in { inherit moc motoko-core frontend backend; }
