import Server "mo:server";
import Assets "mo:assets";
import AssetsTypes "mo:assets/Types";
import Blob "mo:core/Blob";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Result "mo:core/Result";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Option "mo:core/Option";
import Debug "mo:core/Debug";

mixin(creator: Principal) {

  type Request = Server.Request;
  type Response = Server.Response;
  type HttpRequest = Server.HttpRequest;
  type HttpResponse = Server.HttpResponse;
  type ResponseClass = Server.ResponseClass;

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
/*
    Debug.print("commit_batch " # debug_show(args.batch_id));
    for (arg in args.operations.vals()) {
      Debug.print("  :" # debug_show(arg));
      // Force cetificate generation
      let url = switch (arg) {
        case (#CreateAsset(x)) { x.key };
        case (#DeleteAsset(x)) { x.key };
        case (#SetAssetContent(x)) { x.key };
        case (#UnsetAssetContent(x)) { x.key };
        case (_) { ""};
      };
      if (url != "") {
        let request = {
          url;
          method = "GET";
          headers = [];
          body = Blob.empty();
        };
        let _ = await server.http_request_update(request);
      };
    };
*/
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
    // Debug.print("set_asset_content: " # debug_show(arg.key) # ", " # debug_show(arg.sha256));
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
    // Strip away params and headers, because our backend doesn't need them.
    // This simplifies caching mechanism.
    var url = Option.get(Text.split(req.url, #char '?').next(), "/");
    server.http_request({ method = req.method; url; headers = []; body = req.body });
  };

  public func http_request_update(req : HttpRequest) : async HttpResponse {
    // Strip away params and headers, because our backend doesn't need them.
    // This simplifies caching mechanism.
    var url = Option.get(Text.split(req.url, #char '?').next(), "/");
    await server.http_request_update({ method = req.method; url; headers = []; body = req.body });
  };

  public shared ({ caller }) func invalidate_cache() : async () {
    assert(caller == creator);
    ignore server.cache.pruneAll();
  };
} 
