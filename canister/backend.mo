import Array "mo:core/Array";
import Debug "mo:core/Debug";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Option "mo:core/Option";

import JSON "mo:json/JSON";
import ServeHttpRequest "./http";

shared ({ caller = creator }) persistent actor class () {

  include ServeHttpRequest(creator);

  type JSON = JSON.JSON;
  type Clip = {
    clipboard : Text;
    blob : Text;
    created_at : Int;
    expires_at : ?Int;
    burn_after_read : Bool;
  };

  let clips : Map.Map<Text, Clip> = Map.empty<Text, Clip>();

  /**
   * Clip API
   */

  func create_clip(
    blob : Text,
    clipboard : Text,
    expires_after : ?Nat,
    burn_after_read : Bool
  ) : (Result.Result<Text, Text>) {
    if (Map.containsKey(clips, Text.compare, clipboard)) {
      return #err("clipboard already exists");
    };

    let now = Time.now();
    let expires_at = switch (expires_after) {
      case (?after) ?(now + Int.fromNat(after) * 1_000_000_000);
      case null null;
    };

    let clip : Clip = {
      clipboard;
      blob;
      created_at = now;
      expires_at;
      burn_after_read;
    };

    Map.add(clips, Text.compare, clipboard, clip);

    // Lazy cleanup of expired clips
    cleanupExpired(now);

    #ok(clipboard)
  };

  func get_clip(clipboard : Text) : ?Clip {
    switch (Map.get(clips, Text.compare, clipboard)) {
      case (?clip) {
        // Check if expired
        switch (clip.expires_at) {
          case (?expires_at) {
            if (Time.now() > expires_at) {
              null
            } else {
              ?clip
            }
          };
          case null {
            ?clip
          }
        }
      };
      case null { null };
    }
  };

  public func delete_clip(clipboard : Text) : async () {
    Map.remove(clips, Text.compare, clipboard);
  };

  /**
   * Internal: remove all expired clips
   */
  func cleanupExpired(now : Int) {
    for ((key, clip) in Map.entries(clips)) {
      switch (clip.expires_at) {
        case (?expires_at) {
          if (now > expires_at) {
            Map.remove(clips, Text.compare, key);
          };
        };
        case null {};
      }
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

  type Input = {
    blob : Text;
    clipboard : Text;
    expires: ?Nat;
    burn_after_read : Bool;
  };

  func parseInput(clipboard: Text, json: JSON) : ?Input {
    do ? {
      let blob = expectText(json, "blob") !;
      let expires = expectNat(json, "expires");
      let burn_after_read = Option.get(expectBool(json, "burn_after_read"), false);
      { clipboard; blob; expires; burn_after_read }
    }
  };

  func handle_put(req : Request, res : ResponseClass) : async Response {
    let clipboard = do ? {
      let map = req.params !;
      map.get("clipboard") !;
    };
    let (status_code, body) = switch (clipboard, req.body) {
      case (null, _) {
        (400: Nat16, "Parameter /clip/:clipboard not found")
      };
      case (_, null) {
         (400: Nat16, "Missing body")
      };
      case (?clipboard, ?body) {
        switch (body.deserialize()) {
          case (null) {
            (400: Nat16, "Malformed JSON body " # debug_show(body.text()))
          };
          case (?json) {
            switch (parseInput(clipboard, json)) {
              case (null) {
                (400: Nat16, "Malformed input")
              };
              case (?input) {
                switch (create_clip(input.blob, clipboard, input.expires, input.burn_after_read)) {
                  case (#err(err)) {
                    (403 : Nat16, err)
                  };
                  case (#ok(board)) {
                    (201 : Nat16, board)
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
      map.get("clipboard") !;
    };
    let (status_code, body) = switch (board) {
      case (null) {
        (400: Nat16, "Parameter /clip/:clipboard not found")
      };
      case (?clipboard) {
        switch (get_clip(clipboard)) {
          case (null) {
            (404: Nat16, clipboard)
          };
          case (?clip) {
            // TODO: encode blob with base64
            let blob = clip.blob;
            let created = Int.toText(clip.created_at);
            let expires = Option.toText(clip.expires_at, Int.toText);
            (
              200 : Nat16,
              "{ \"blob\": \"" # clip.blob #
              "\",\"created\": \"" # created #
              "\", \"expires\": \"" # expires #
              "\" }"
            )
          }
        }
      }
    };
    res.json({
      status_code = status_code;
      body = body;
      cache_strategy = #default;
    })
  };

  server.get("/clip/:clipboard", handle_get);
  server.put("/clip/:clipboard", handle_put);

};
