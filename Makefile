NAME=backend
BACKEND_MAIN_SRC=backend/main.mo
BACKEND_SRC=$(wildcard backend/*.mo)
MOC_VERSION=$(shell grep compiler vessel.dhall|cut -d\" -f2)
MOC?=.vessel/.bin/$(MOC_VERSION)/moc
MOTOKO_CORE_VERSION=$(shell grep -C1 'name.*core' package-set.dhall|grep version|cut -d\" -f2)
MOTOKO_SHA2_VERSION=$(shell grep -C1 'name.*sha2' package-set.dhall|grep version|cut -d\" -f2)
MOTOKO_CORE?=.vessel/core/$(MOTOKO_CORE_VERSION)
MOTOKO_SHA2?=.vessel/sha2/$(MOTOKO_SHA2_VERSION)
DIDC?=didc

default: backend frontend

backend: build/$(NAME).wasm build/$(NAME)-did.ts build/$(NAME)-did.mjs

ASSETS_SRC=assets/kopicat.png
ASSETS_DIR=static
ASSETS=\
	$(ASSETS_DIR)/kopicat-192x192.png \
	$(ASSETS_DIR)/kopicat-128x128.png \
	$(ASSETS_DIR)/kopicat-64x64.png \
	$(ASSETS_DIR)/kopicat-32x32.png \
	$(ASSETS_DIR)/favicon-16x16.png \
	$(ASSETS_DIR)/favicon-32x32.png \
	$(ASSETS_DIR)/apple-touch-icon.png

frontend: | assets
	pnpm run build

assets: $(ASSETS)

$(ASSETS_DIR)/kopicat-192x192.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 192x192 $@

$(ASSETS_DIR)/kopicat-128x128.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 128x128 $@

$(ASSETS_DIR)/kopicat-64x64.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 64x64 $@

$(ASSETS_DIR)/kopicat-32x32.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 32x32 $@

$(ASSETS_DIR)/favicon-16x16.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 16x16 $@

$(ASSETS_DIR)/favicon-32x32.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 32x32 $@

$(ASSETS_DIR)/apple-touch-icon.png: $(ASSETS_SRC) | $(ASSETS_DIR)/
	magick $< -resize 180x180 $@

$(ASSETS_DIR)/:
	mkdir -p $(ASSETS_DIR)

build/$(NAME).wasm build/$(NAME).did &: ${BACKEND_SRC} $(MOC) $(MOTOKO_CORE) $(MOTOKO_SHA2) | .vessel/ build/
	$(MOC) --public-metadata candid:service --public-metadata candid:args --public-metadata motoko:compiler \
	    --idl -c -o $@ --package core $(MOTOKO_CORE)/src --package sha2 $(MOTOKO_SHA2)/src $(BACKEND_MAIN_SRC)

build/$(NAME)-did.ts: build/$(NAME).did
	$(DIDC) bind -t ts $< > $@

build/$(NAME)-did.mjs: build/$(NAME).did
	$(DIDC) bind -t js $< > $@

$(MOC):
	mkdir -p $$(dirname $@)
	ln -s $$(nix-build -A moc --no-out-link)/bin/moc $@

$(MOTOKO_CORE):
	mkdir -p $$(dirname $@)
	nix-build -A motoko-core -o $@

$(MOTOKO_SHA2):
	mkdir -p $$(dirname $@)
	nix-build -A motoko-sha2 -o $@

build/:
	mkdir -p $@

clean:
	rm -rf dist/ build/ $(ASSETS)

distclean: clean
	rm -rf .vessel/

.PHONY: default backend frontend assets clean distclean
