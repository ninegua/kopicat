let Package =
    { name : Text, version : Text, repo : Text, dependencies : List Text }
in
    [
      { name = "core"
      , version = "v2.5.0"
      , repo = "https://github.com/caffeinelabs/motoko-core"
      , dependencies = [] : List Text
      },
      { name = "sha2"
      , version = "fffed5cfd1e9cc21d0443be2cc3b7f5ac4f36e36"
      , repo = "https://github.com/research-ag/sha2"
      , dependencies = [ "core" ]
      },
    ] : List Package
