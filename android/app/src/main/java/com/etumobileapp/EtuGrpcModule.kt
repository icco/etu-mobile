package com.etumobileapp

import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import io.grpc.*
import io.grpc.okhttp.OkHttpChannelBuilder
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.net.URI
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/** Raw unary gRPC bridge. Protobuf serialization stays in the shared TypeScript client. */
class EtuGrpcModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val channels = ConcurrentHashMap<String, ManagedChannel>()
  private val calls = ConcurrentHashMap<String, ClientCall<ByteArray, ByteArray>>()
  override fun getName() = "EtuGrpc"

  private val marshaller = object : MethodDescriptor.Marshaller<ByteArray> {
    override fun stream(value: ByteArray): InputStream = ByteArrayInputStream(value)
    override fun parse(stream: InputStream): ByteArray = stream.readBytes()
  }

  @ReactMethod
  fun unary(id: String, endpoint: String, method: String, payload: String,
            headers: ReadableMap, timeoutMs: Double, promise: Promise) {
    try {
      val uri = URI(endpoint)
      require(uri.scheme == "https" || (uri.scheme == "http" && uri.host in listOf("localhost", "127.0.0.1", "10.0.2.2")))
      require(uri.host != null && uri.userInfo == null && uri.rawQuery == null && (uri.path.isNullOrEmpty() || uri.path == "/"))
      val channel = channels.computeIfAbsent(endpoint) {
        val builder = OkHttpChannelBuilder.forAddress(uri.host, if (uri.port > 0) uri.port else if (uri.scheme == "https") 443 else 80)
          .maxInboundMessageSize(16 * 1024 * 1024)
          .disableRetry()
        if (uri.scheme == "https") builder.useTransportSecurity() else builder.usePlaintext()
        builder.build()
      }
      val descriptor = MethodDescriptor.newBuilder<ByteArray, ByteArray>()
        .setType(MethodDescriptor.MethodType.UNARY).setFullMethodName(method)
        .setRequestMarshaller(marshaller).setResponseMarshaller(marshaller).build()
      val call = channel.newCall(descriptor, CallOptions.DEFAULT.withDeadlineAfter(timeoutMs.toLong(), TimeUnit.MILLISECONDS))
      val metadata = Metadata()
      val keys = headers.keySetIterator()
      while (keys.hasNextKey()) {
        val key = keys.nextKey()
        metadata.put(Metadata.Key.of(key, Metadata.ASCII_STRING_MARSHALLER), headers.getString(key) ?: "")
      }
      calls[id] = call
      call.start(object : ClientCall.Listener<ByteArray>() {
        private var response: ByteArray? = null
        override fun onMessage(message: ByteArray) { response = message }
        override fun onClose(status: Status, trailers: Metadata) {
          calls.remove(id)
          if (!status.isOk) promise.reject(status.code.value().toString(), status.description ?: status.code.name)
          else if (response == null) promise.reject("13", "Missing gRPC response")
          else promise.resolve(Base64.encodeToString(response, Base64.NO_WRAP))
        }
      }, metadata)
      call.request(2)
      call.sendMessage(Base64.decode(payload, Base64.DEFAULT))
      call.halfClose()
    } catch (error: Exception) {
      calls.remove(id)?.cancel("Invalid request", error)
      promise.reject("13", "Unable to start gRPC request", error)
    }
  }

  @ReactMethod
  fun cancel(id: String) { calls[id]?.cancel("Request cancelled", null) }

  override fun invalidate() {
    calls.values.forEach { it.cancel("Module invalidated", null) }
    calls.clear()
    channels.values.forEach { it.shutdownNow() }
    channels.clear()
    super.invalidate()
  }
}

class EtuGrpcPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(EtuGrpcModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
