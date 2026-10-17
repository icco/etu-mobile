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

/** Raw gRPC bridge. Protobuf serialization stays in the shared TypeScript client. */
class EtuGrpcModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val channels = ConcurrentHashMap<String, ManagedChannel>()
  private val calls = ConcurrentHashMap<String, ClientCall<ByteArray, ByteArray>>()
  private val streams = ConcurrentHashMap<String, StreamState>()
  override fun getName() = "EtuGrpc"

  private class StreamState(val call: ClientCall<ByteArray, ByteArray>) {
    val queue = ArrayDeque<ByteArray>()
    var pending: Promise? = null
    var status: Status? = null
  }

  private val marshaller = object : MethodDescriptor.Marshaller<ByteArray> {
    override fun stream(value: ByteArray): InputStream = ByteArrayInputStream(value)
    override fun parse(stream: InputStream): ByteArray = stream.readBytes()
  }

  private fun newCall(endpoint: String, method: String, type: MethodDescriptor.MethodType, timeoutMs: Double): ClientCall<ByteArray, ByteArray> {
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
      .setType(type).setFullMethodName(method)
      .setRequestMarshaller(marshaller).setResponseMarshaller(marshaller).build()
    return channel.newCall(descriptor, CallOptions.DEFAULT.withDeadlineAfter(timeoutMs.toLong(), TimeUnit.MILLISECONDS))
  }

  private fun metadata(headers: ReadableMap): Metadata {
    val metadata = Metadata()
    val keys = headers.keySetIterator()
    while (keys.hasNextKey()) {
      val key = keys.nextKey()
      metadata.put(Metadata.Key.of(key, Metadata.ASCII_STRING_MARSHALLER), headers.getString(key) ?: "")
    }
    return metadata
  }

  private fun encode(message: ByteArray) = Base64.encodeToString(message, Base64.NO_WRAP)

  private fun settle(promise: Promise, status: Status) {
    if (status.isOk) promise.resolve(null)
    else promise.reject(status.code.value().toString(), status.description ?: status.code.name)
  }

  @ReactMethod
  fun unary(id: String, endpoint: String, method: String, payload: String,
            headers: ReadableMap, timeoutMs: Double, promise: Promise) {
    try {
      val call = newCall(endpoint, method, MethodDescriptor.MethodType.UNARY, timeoutMs)
      val metadata = metadata(headers)
      calls[id] = call
      call.start(object : ClientCall.Listener<ByteArray>() {
        private var response: ByteArray? = null
        override fun onMessage(message: ByteArray) { response = message }
        override fun onClose(status: Status, trailers: Metadata) {
          calls.remove(id)
          if (!status.isOk) promise.reject(status.code.value().toString(), status.description ?: status.code.name)
          else if (response == null) promise.reject("13", "Missing gRPC response")
          else promise.resolve(encode(response!!))
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
  fun serverStream(id: String, endpoint: String, method: String, payload: String,
                   headers: ReadableMap, timeoutMs: Double, promise: Promise) {
    try {
      val call = newCall(endpoint, method, MethodDescriptor.MethodType.SERVER_STREAMING, timeoutMs)
      val metadata = metadata(headers)
      val state = StreamState(call)
      streams[id] = state
      call.start(object : ClientCall.Listener<ByteArray>() {
        override fun onMessage(message: ByteArray) {
          val waiting = synchronized(state) {
            val pending = state.pending
            state.pending = null
            if (pending == null) state.queue.addLast(message)
            pending
          }
          if (waiting != null) {
            waiting.resolve(encode(message))
            call.request(1)
          }
        }
        override fun onClose(status: Status, trailers: Metadata) {
          val waiting = synchronized(state) {
            state.status = status
            val pending = state.pending
            state.pending = null
            pending
          }
          if (waiting != null) {
            streams.remove(id)
            settle(waiting, status)
          }
        }
      }, metadata)
      call.request(1)
      call.sendMessage(Base64.decode(payload, Base64.DEFAULT))
      call.halfClose()
      promise.resolve(null)
    } catch (error: Exception) {
      streams.remove(id)?.call?.cancel("Invalid request", error)
      promise.reject("13", "Unable to start gRPC stream", error)
    }
  }

  @ReactMethod
  fun next(id: String, promise: Promise) {
    val state = streams[id]
    if (state == null) {
      promise.reject("5", "Unknown gRPC stream")
      return
    }
    val (message, closed) = synchronized(state) {
      val message = state.queue.removeFirstOrNull()
      val closed = if (message == null) state.status else null
      if (message == null && closed == null) state.pending = promise
      Pair(message, closed)
    }
    if (message != null) {
      promise.resolve(encode(message))
      state.call.request(1)
    } else if (closed != null) {
      streams.remove(id)
      settle(promise, closed)
    }
  }

  @ReactMethod
  fun cancel(id: String) {
    calls[id]?.cancel("Request cancelled", null)
    streams[id]?.call?.cancel("Request cancelled", null)
  }

  override fun invalidate() {
    calls.values.forEach { it.cancel("Module invalidated", null) }
    calls.clear()
    streams.values.forEach { it.call.cancel("Module invalidated", null) }
    streams.clear()
    channels.values.forEach { it.shutdownNow() }
    channels.clear()
    super.invalidate()
  }
}

class EtuGrpcPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(EtuGrpcModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
