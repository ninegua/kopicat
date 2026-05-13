import Iter "mo:base/Iter";
import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Debug "mo:core/Debug";
import HashMap "mo:StableHashMap/ClassStableHashMap";
import Utils "mo:server/Utils";
import HttpParser "mo:http-parser/lib";

func findMatchingPattern(path : Text, map : HashMap.StableHashMap<Text, Text>) : ?Text {
      let entrie = map.entries();
      Debug.print(debug_show("entries", Iter.toArray(entrie)));
      let entries = map.entries();
      for (entry in entries) {
        let (pattern, _) = entry;
        Debug.print(debug_show(("path", path, "pattern", pattern)));
        switch (Utils.parsePathParams(pattern, path)) {
          case (#ok params) {
            let function = map.get(pattern);
            switch (function) {
              case (?f) {
                return ?(f);
              };
              case null {
                return null;
              };
            };
          };
          case (#err _) {};
        };
      };
      return null;
};

let map = HashMap.StableHashMap<Text, Text>(0, Text.equal, Text.hash);

let { url; method } = HttpParser.parse({
    url = "/clip/abc";
    headers = [("host", "m7sm4-2iaaa-aaaab-qabra-cai.raw.ic0.app")];
    method = "GET";
    body = Blob.fromArray([]);
});

Debug.print(debug_show("base, full", Utils.simplifyRoute(url)));

map.put("/clip/:id", "clip");
Debug.print(debug_show(findMatchingPattern("/clip/abc", map)));
map.put("/api/stats", "stats");
Debug.print(debug_show(findMatchingPattern("/api/stats", map)));
Debug.print(debug_show(findMatchingPattern("/clip/abc", map)));

