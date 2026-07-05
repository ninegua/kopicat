# The default hash is with nixpkgs unstable. Supply `pnpmDepsHash` if you want to pin nixpkgs.
{ pkgs ? import <nixpkgs> { }
, pnpmDepsHash ? "sha256-+qysXTGTj82hXKzWNOsTl9VArOgfWAccPb26/mYUf5s="
, version ? "0.0.1" }:
with pkgs;
let
  ic-nix = fetchFromGitHub {
    owner = "ninegua";
    repo = "ic-nix";
    rev = "20260616";
    sha256 = "sha256-C/er0a+IFaUuq+nffzgmXhy7YFAxl35lDkV2WNZ8Iis=";
  };
  ic-pkgs = import "${ic-nix}/default.nix" { inherit pkgs; };
  moc = ic-pkgs.motoko.moc;
  candid = ic-pkgs.candid;
  deps = builtins.concatStringsSep " " (builtins.builtins.map (pkg:
    "${pkg.name}=${
      builtins.fetchGit {
        url = pkg.repo;
        rev = pkgs.version;
      }
    }") (dhallToNix ./package-set.dhall));
  motoko-core = fetchFromGitHub {
    owner = "caffeinelabs";
    repo = "motoko-core";
    rev = motoko-core-version;
    sha256 = "sha256-Tl7p+94UteAC1oaUo9cG+yp6HtlyrFGbATvOGwBn2Ro=";
  };
  motoko-sha2-revision = "fffed5cfd1e9cc21d0443be2cc3b7f5ac4f36e36";
  motoko-sha2 = fetchFromGitHub {
    owner = "research-ag";
    repo = "sha2";
    rev = motoko-sha2-revision;
    sha256 = "sha256-+EPzFj9dSVSaupkoSZ925i73NHyPuSPyNXEJxZjRR9Y=";
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
    configurePhase = "mkdir .vessel";
    buildPhase = ''
      make backend ${deps}"
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

in { inherit moc motoko-core motoko-sha2 frontend backend; }
