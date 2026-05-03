import Array "mo:core/Array";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Option "mo:core/Option";

import JSON "mo:json/JSON";
import ServeHttpRequest "./http";

shared ({ caller = creator }) persistent actor class (init_arg: ? { max_seconds_to_live: Nat }) {

  include ServeHttpRequest(creator);

  type JSON = JSON.JSON;

  // Both created_at and expires_at are timestamp in seconds.
  type Clip = {
    blob : Text;
    created_at : Int;
    expires_at : Int;
    burn_after_read : Bool;
  };

  let clips : Map.Map<Text, Clip> = Map.empty<Text, Clip>();

  // Default max time to live is 7 days or a week.
  let DEFAULT_MAX_SECONDS_TO_LIVE: Nat = 3600 * 24 * 7;

  type Input = {
    id : Text;
    blob : Text;
    expires_after: ?Nat;
    burn_after_read : Bool;
  };

  func create_clip(input : Input) : (Result.Result<Text, Text>) {
    let { id; blob; expires_after; burn_after_read } = input;
    if (Map.containsKey(clips, Text.compare, id)) {
      return #err("clip already exists");
    };

    let default_ttl = switch (init_arg) {
      case (null) DEFAULT_MAX_SECONDS_TO_LIVE;
      case (?{ max_seconds_to_live }) max_seconds_to_live;
    };
    let now = now_secs();
    let expires_at = now + Option.get(expires_after, default_ttl);
    let clip : Clip = {
      blob;
      created_at = now;
      expires_at;
      burn_after_read;
    };

    Map.add(clips, Text.compare, id, clip);

    // Lazy cleanup of expired clips
    cleanupExpired(now);

    #ok(id)
  };

  func now_secs() : Int {
    Time.now() / 1_000_000_000
  };

  func get_clip(id: Text) : ?Clip {
    switch (Map.get(clips, Text.compare, id)) {
      case (?clip) {
        // Check if expired
        if (now_secs() > clip.expires_at) {
          null
        } else {
          ?clip
        }
      };
      case null { null };
    }
  };

  func delete_clip(id: Text) {
    Map.remove(clips, Text.compare, id);
  };

  /**
   * Internal: remove all expired clips
   */
  func cleanupExpired(now : Int) {
    for ((key, clip) in Map.entries(clips)) {
      if (now > clip.expires_at) {
        Map.remove(clips, Text.compare, key);
      };
    }
  };

  func fieldOf(json: ?JSON, name: Text) : ?JSON {
     switch json {
       case (?(#Object(fields))) {
         for ((key, value) in Array.values(fields)) {
           if (key == name) {
             return ?value;
           }
         }
       };
       case _ {}
     };
     null
  };

  func expectText(json: JSON, field: Text) : ?Text {
    switch (fieldOf(?json, field)) {
      case (?(#String(val))) { ?val };
      case _ { null };
    };
  };

  func expectInt(json: JSON, field: Text) : ?Int {
    switch (fieldOf(?json, field)) {
      case (?(#Number(val))) { ?val };
      case _ { null };
    };
  };

  func expectNat(json: JSON, field: Text) : ?Nat {
    do ? {
      let val = expectInt(json, field) !;
      let nat = (if (val < 0) { null } else { ?Int.abs(val) }) !;
      nat
    };
  };

  func expectBool(json: JSON, field: Text) : ?Bool {
    switch (fieldOf(?json, field)) {
      case (?(#Boolean(val))) { ?val };
      case _ { null };
    };
  };

  func parseInput(id: Text, json: JSON) : ?Input {
    do ? {
      let blob = expectText(json, "blob") !;
      let expires_after = expectNat(json, "expires_after");
      let burn_after_read = Option.get(expectBool(json, "burn_after_read"), false);
      { id; blob; expires_after; burn_after_read }
    }
  };

  func handle_put(req : Request, res : ResponseClass) : async Response {
    let id = do ? {
      let map = req.params !;
      map.get("id") !;
    };
    let (status_code, body) = switch (id, req.body) {
      case (null, _) {
        (400: Nat16, "\"" # "Parameter /clip/:id not found" # "\"")
      };
      case (_, null) {
         (400: Nat16, "\"" # "Missing body" # "\"")
      };
      case (?id, ?body) {
        switch (body.deserialize()) {
          case (null) {
            (400: Nat16, "\"" # "Malformed JSON body" # "\"")
          };
          case (?json) {
            switch (parseInput(id, json)) {
              case (null) {
                (400: Nat16, "\"" # "Malformed input" # "\"")
              };
              case (?input) {
                switch (create_clip(input)) {
                  case (#err(err)) {
                    (403 : Nat16, "\"" # err # "\"")
                  };
                  case (#ok(board)) {
                    (200 : Nat16, "\"" # board # "\"")
                  }
                }
              }
            }
          }
        }
      }
    };
    res.json({
      status_code = status_code;
      body = body;
      cache_strategy = #noCache;
    })
  };

  func handle_get(req : Request, res : ResponseClass) : async Response {
    let board = do ? {
      let map = req.params !;
      map.get("id") !;
    };
    let (status_code, body, cache_strategy) = switch (board) {
      case (null) {
        (400: Nat16, "\"" # "Parameter /clip/:id not found" # "\"", #noCache)
      };
      case (?id) {
        switch (get_clip(id)) {
          case (null) {
            (404: Nat16, "\"" # "Not found" # "\"", #noCache)
          };
          case (?clip) {
            // TODO: encode blob with base64
            let blob = clip.blob;
            let created_at = Int.toText(clip.created_at);
            let expires_at = Int.toText(clip.expires_at);
            let burn_after_read = debug_show(clip.burn_after_read);
            let cache_strategy = if (clip.burn_after_read) {
              delete_clip(id);
              #noCache
            } else {
              // certified-cache has expiration related bugs. So always noCache for now.
              #noCache
              // Since get_clip already handles expiry, nanoseconds is always > 0
              // let nanoseconds = (clip.expires_at - now_secs()) * 1_000_000_000;
              // #expireAfter{ nanoseconds = Int.abs(nanoseconds) }
            };
            (
              200 : Nat16,
              "{\"blob\": \"" # clip.blob #
              "\",\"created_at\": " # created_at #
              ",\"expires_at\": " # expires_at #
              ",\"burn_after_read\": " # burn_after_read #
              "}",
              cache_strategy
            )
          }
        }
      }
    };
    res.json({ status_code; body; cache_strategy; })
  };

  server.get("/clip/:id", handle_get);
  server.put("/clip/:id", handle_put);

  system func preupgrade() {
    serializedEntries := server.entries();
  };

  system func postupgrade() {
    ignore server.cache.pruneAll();
  };
};
