import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Option "mo:core/Option";

shared ({ caller = creator }) persistent actor class (init_arg: ? { max_seconds_to_live: Nat; max_blob_bytes: Nat }) {

  // Both created_at and expires_at are timestamp in seconds.
  type Clip = {
    blob : Blob;
    created_at : Int;
    expires_at : Int;
    burn_after_read : Bool;
  };

  let clips : Map.Map<Text, Clip> = Map.empty<Text, Clip>();

  var total_clips_created : Nat = 0;

  // Default max time to live is 7 days or a week.
  let MAX_SECONDS_TO_LIVE: Nat = 3600 * 24 * 7;

  // Default max bytes for blob is 1MB.
  let MAX_BLOB_BYTES : Nat = 1024 * 1024;

  type Input = {
    id : Text;
    blob : Blob;
    expires_after: ?Nat;
    burn_after_read : Bool;
  };

  type Stats = {
    max_seconds_to_live: Nat;
    total_clips_created: Nat;
    available_clips: Nat;
  };

  public shared func get_stats() : async Stats {
    let max_seconds_to_live = switch (init_arg) {
      case (null) MAX_SECONDS_TO_LIVE;
      case (?{ max_seconds_to_live }) max_seconds_to_live;
    };
    let now = now_secs();
    var num_clips = Int.fromNat(Map.size(clips));
    mapOverExpired(now, func(key, _) { num_clips := num_clips - 1; });
    let available_clips = if (num_clips < 0) 0 else Int.abs(num_clips);
    { max_seconds_to_live; total_clips_created; available_clips }
  };

  public shared func create_clip(input : Input) : async (Result.Result<Text, Text>) {
    let { id; blob; expires_after; burn_after_read } = input;
    let now = now_secs();

    switch (Map.get(clips, Text.compare, id)) {
      case (?clip) {
        if (now <= clip.expires_at) {
          return #err("Clip already exists");
        }
      };
      case (null) {}
    };

    let max_bytes = switch (init_arg) {
      case (null) MAX_BLOB_BYTES;
      case (?{ max_blob_bytes }) max_blob_bytes;
    };
    if (Blob.size(blob) > max_bytes) {
      return #err("Blob cannot exceed " # Nat.toText(max_bytes) # " bytes.");
    };

    let max_ttl = switch (init_arg) {
      case (null) MAX_SECONDS_TO_LIVE;
      case (?{ max_seconds_to_live }) max_seconds_to_live;
    };
    let expires_at = now + Option.get(expires_after, max_ttl);
    if (expires_at > now + max_ttl) {
      return #err("Expiration must be within " # Nat.toText(max_ttl) # " seconds.");
    };
    let clip : Clip = {
      blob;
      created_at = now;
      expires_at;
      burn_after_read;
    };

    Map.add(clips, Text.compare, id, clip);

    // Lazy cleanup of expired clips
    cleanupExpired(now);
    total_clips_created := total_clips_created + 1;
    #ok(id)
  };

  func now_secs() : Int {
    Time.now() / 1_000_000_000
  };

  public shared query func get_clip(id: Text) : async ?Clip {
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

  /**
   * Internal: remove all expired clips
   */
  func cleanupExpired(now : Int) {
    mapOverExpired(now, func(key, _) { Map.remove(clips, Text.compare, key) });
  };

  func mapOverExpired(now : Int, f : (Text, Clip) -> ()) {
    for ((key, clip) in Map.entries(clips)) {
      if (now > clip.expires_at) {
        f(key, clip);
      };
    }
  };
};
