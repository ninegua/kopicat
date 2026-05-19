let Package =
    { name : Text, version : Text, repo : Text, dependencies : List Text }
in
    [
      { name = "core"
      , version = "v2.5.0"
      , repo = "https://github.com/caffeinelabs/motoko-core"
      , dependencies = [] : List Text
      }
    ] : List Package
