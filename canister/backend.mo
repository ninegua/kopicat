import Server "mo:server";
import Assets "mo:assets";
import AssetsTypes "mo:assets/Types";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Nat "mo:core/Nat";

shared ({ caller = creator }) persistent actor class () {

  type Request = Server.Request;
  type Response = Server.Response;
  type HttpRequest = Server.HttpRequest;
  type HttpResponse = Server.HttpResponse;
  type ResponseClass = Server.ResponseClass;

  type Clip = {
    clipboard : Text;
    blob : Text;
    created_at : Int;
    expires_at : ?Int;
    burn_after_read : Bool;
  };

  let clips : Map.Map<Text, Clip> = Map.empty<Text, Clip>();

  var serializedEntries : Server.SerializedEntries = ([], [], [creator]);

  transient let server = Server.Server({ serializedEntries });

  transient let assets = server.assets;

  public shared ({ caller }) func authorize(other : Principal) : async () {
    server.authorize({
      caller;
      other;
    });
  };

  public query func retrieve(path : Assets.Path) : async Assets.Contents {
    assets.retrieve(path);
  };

  public shared ({ caller }) func store(
    arg : {
      key : Assets.Key;
      content_type : Text;
      content_encoding : Text;
      content : Blob;
      sha256 : ?Blob;
    }
  ) : async () {
    server.store({
      caller;
      arg;
    });
  };

  public query func list(arg : {}) : async [AssetsTypes.AssetDetails] {
    assets.list(arg);
  };

  public query func get(
    arg : {
      key : AssetsTypes.Key;
      accept_encodings : [Text];
    }
  ) : async ({
    content : Blob;
    content_type : Text;
    content_encoding : Text;
    total_length : Nat;
    sha256 : ?Blob;
  }) {
    assets.get(arg);
  };

  public shared ({ caller }) func create_batch(arg : {}) : async ({
    batch_id : AssetsTypes.BatchId;
  }) {
    assets.create_batch({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func create_chunk(
    arg : {
      batch_id : AssetsTypes.BatchId;
      content : Blob;
    }
  ) : async ({
    chunk_id : AssetsTypes.ChunkId;
  }) {
    assets.create_chunk({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func commit_batch(args : AssetsTypes.CommitBatchArguments) : async () {
    assets.commit_batch({
      caller;
      args;
    });
  };

  public shared ({ caller }) func create_asset(arg : AssetsTypes.CreateAssetArguments) : async () {
    assets.create_asset({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func set_asset_content(arg : AssetsTypes.SetAssetContentArguments) : async () {
    assets.set_asset_content({
      caller;
      arg;
    });
  };

  public shared ({ caller }) func unset_asset_content(args : AssetsTypes.UnsetAssetContentArguments) : async () {
    assets.unset_asset_content({
      caller;
      args;
    });
  };

  public shared ({ caller }) func delete_asset(args : AssetsTypes.DeleteAssetArguments) : async () {
    assets.delete_asset({
      caller;
      args;
    });
  };

  public shared ({ caller }) func clear(args : AssetsTypes.ClearArguments) : async () {
    assets.clear({
      caller;
      args;
    });
  };

  public type StreamingCallbackToken = {
    key : Text;
    content_encoding : Text;
    index : Nat;
    sha256 : ?Blob;
  };

  public type StreamingCallbackHttpResponse = {
    body : Blob;
    token : ?StreamingCallbackToken;
  };

  public query func http_request_streaming_callback(token : AssetsTypes.StreamingCallbackToken) : async StreamingCallbackHttpResponse {
    assets.http_request_streaming_callback(token);
  };

  public query func http_request(req : HttpRequest) : async HttpResponse {
    server.http_request(req)
  };

  public func http_request_update(req : HttpRequest) : async HttpResponse {
    await server.http_request_update(req)
  };

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

  public shared ({ caller }) func invalidate_cache() : async () {
    assert(caller == creator);
    ignore server.cache.pruneAll();
  };
};
