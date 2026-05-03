NAME=copycat
VERSION?=$(shell git rev-parse --abbrev-ref HEAD)
BACKEND_MAIN_SRC=canister/backend.mo
BACKEND_SRC=$(wildcard canister/*.mo)
MOC_VERSION=$(shell grep compiler vessel.dhall|cut -d\" -f2)
MOC=.vessel/.bin/$(MOC_VERSION)/moc

default: backend frontend

backend: build/$(NAME).wasm

frontend:
	pnpm run build

build/$(NAME).wasm build/$(NAME).did &: ${BACKEND_SRC} $(MOC) | .vessel/ build/
	$(MOC) --public-metadata candid:service --public-metadata candid:args --public-metadata motoko:compiler \
	    --idl -c -o $@ $$(vessel sources) $(BACKEND_MAIN_SRC)

$(MOC): | .vessel/
	vessel bin

# Notes on post processing:
# 1. "mo:server" needs a critical bug fix on route math
# 2. Force packages to use the same "mo:base" version
.vessel/: vessel.dhall package-set.dhall
	vessel install && \
		sed -i '158c\// return null;' .vessel/server/*/src/lib.mo && \
		sed -i 's/base-0.7.3/base/g' $$(find .vessel -type f)

build/:
	mkdir -p $@

clean:
	rm -rf build/

distclean: clean
	rm -rf .vessel/

.PHONY: build backend clean distclean
