import Server "mo:server";
import Assets "mo:assets";
import AssetsTypes "mo:assets/Types";
import Option "mo:base/Option";
import Text "mo:base/Text";

shared ({ caller = creator }) persistent actor class () {
  type Request = Server.Request;
  type Response = Server.Response;
  type HttpRequest = Server.HttpRequest;
  type HttpResponse = Server.HttpResponse;
  type ResponseClass = Server.ResponseClass;

 /*
  * The following code implements HTTP server interface accepting
  * asset uploads from icx-assets and serving them over HTTP interface.
  */

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
    var url = Option.get(Text.split(req.url, #char '?').next(), "/");
    if (Text.endsWith(url, #text "status")) { url := req.url; };
    server.http_request({ method = req.method; url; headers = req.headers; body = req.body });
  };
  public func http_request_update(req : HttpRequest) : async HttpResponse {
    var url = Option.get(Text.split(req.url, #char '?').next(), "/");
    if (Text.endsWith(url, #text "status")) { url := req.url; };
    await server.http_request_update({ method = req.method; url; headers = req.headers; body = req.body });
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
