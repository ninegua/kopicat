{ pkgs ? import <nixpkgs> { } }:
with pkgs;
let
  ic-nix = fetchFromGitHub {
    owner = "ninegua";
    repo = "ic-nix";
    rev = "20260515";
    sha256 = "sha256:0xslzm2jdsikmws9rz09wrdr9zy16wsj4mg945fpdxz3y6sc2dnz";
  };
  ic-pkgs = import "${ic-nix}/default.nix" { inherit pkgs; };
  motoko-core-version = "v2.5.0";
  motoko-core = fetchFromGitHub {
    owner = "caffeinelabs";
    repo = "motoko-core";
    rev = motoko-core-version;
    sha256 = "sha256-Tl7p+94UteAC1oaUo9cG+yp6HtlyrFGbATvOGwBn2Ro=";
  };
  backend = stdenv.mkDerivation {
    name = "kopicat";
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
    nativeBuildInputs = with ic-pkgs; [ vessel candid ];
    configurePhase = "mkdir .vessel";
    buildPhase = ''
      make backend MOC=${ic-pkgs.motoko.moc}/bin/moc VESSEL_SOURCES="--package core ${motoko-core}/src"
    '';
    installPhase = ''
      mkdir -p $out
      cp -r build/* $out
    '';
  };
  frontend = stdenv.mkDerivation (finalAttrs: {
    pname = "kopicat";
    version = "0.0.1";
    src = lib.cleanSourceWith (rec {
      src = ./.;
      filter = path: type:
        let relPath = lib.removePrefix (toString src + "/") (toString path);
        in lib.any (prefix: lib.hasPrefix prefix relPath) [
          "frontend"
          "assets"
          "static"
          "package.json"
          "pnpm-lock.yaml"
          "svelte.config.js"
          "tsconfig.json"
          "vite.config.js"
          "vitest.config.ts"
          ".icp"
        ];
    });
    nativeBuildInputs = [ nodejs pnpm pnpmConfigHook imagemagick ];

    pnpmDeps = fetchPnpmDeps {
      inherit (finalAttrs) pname version src;
      fetcherVersion = 3;
      hash = "sha256-5DYWAgl/3WjrUdLHdnurayOjedUPSUn6SLEjsHasr9o=";
    };
    buildPhase = ''
      runHook preBuild
      ln -s ${backend} build
      pnpm build
      runHook postBuild
    '';
    checkPhase = ''
      pnpm check
      pnpm test
    '';
    installPhase = "cp -r dist $out";
    doCheck = true;
  });

in { inherit frontend backend; }
