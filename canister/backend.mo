import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import ServeHttpRequest "./http";

shared ({ caller = creator }) persistent actor class () {

  include ServeHttpRequest(creator);

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

  public func create_clip(
    blob : Text,
    clipboard : Text,
    expires_after : ?Nat,
    burn_after_read : Bool
  ) : async (Result.Result<Text, Text>) {
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

  public query func get_clip(clipboard : Text) : async (?Clip) {
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

  /**
    * upgrade hooks
    */
  system func preupgrade() {
    serializedEntries := server.entries();
  };

  system func postupgrade() {
    ignore server.cache.pruneAll();
  };

};
