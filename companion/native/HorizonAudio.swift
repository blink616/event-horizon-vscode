import CoreAudio
import Foundation

// A streaming three-band envelope detector. Samples are never stored or exported.
final class Envelope {
    private struct Channel { var low = 0.0; var mid = 0.0; var dc = 0.0 }
    private var channels: [Channel]
    private let lowAlpha: Double
    private let midAlpha: Double
    private let dcAlpha: Double
    private var energy = [Double](repeating: 0, count: 4)
    private var count = 0

    init(sampleRate: Double, channels: Int) {
        self.channels = Array(repeating: Channel(), count: channels)
        lowAlpha = 1 - exp(-2 * .pi * 200 / sampleRate)
        midAlpha = 1 - exp(-2 * .pi * 2_000 / sampleRate)
        dcAlpha = 1 - exp(-2 * .pi * 20 / sampleRate)
    }

    func consume(_ input: Double, channel: Int) {
        guard input.isFinite, channels.indices.contains(channel) else { return }
        let sample = max(-1, min(1, input))
        channels[channel].dc += dcAlpha * (sample - channels[channel].dc)
        channels[channel].low += lowAlpha * (sample - channels[channel].low)
        channels[channel].mid += midAlpha * (sample - channels[channel].mid)
        let bass = channels[channel].low - channels[channel].dc
        let mid = channels[channel].mid - channels[channel].low
        let treble = sample - channels[channel].mid
        energy[0] += bass * bass
        energy[1] += mid * mid
        energy[2] += treble * treble
        energy[3] += sample * sample
        count += 1
    }

    func snapshot() -> [String: Double] {
        var result: [String: Double] = [:]
        for (index, key) in ["bass", "mid", "treble", "level"].enumerated() {
            result[key] = count == 0 ? 0 : min(1, sqrt(energy[index] / Double(count)) * 4)
            energy[index] = 0
        }
        count = 0
        return result
    }
}

func emit(_ event: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: event, options: [.sortedKeys]) else { return }
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data([10]))
}

struct CaptureError: Error, CustomStringConvertible {
    let description: String
}

func check(_ status: OSStatus, _ operation: String) throws {
    if status != noErr {
        throw CaptureError(description: "\(operation) failed (\(status)). Allow system audio for Horizon Audio or VS Code in Privacy & Security → Screen & System Audio Recording, then restart capture.")
    }
}

@available(macOS 14.2, *)
final class SystemAudio {
    private var tap = AudioObjectID(kAudioObjectUnknown)
    private var device = AudioObjectID(kAudioObjectUnknown)
    private var ioProc: AudioDeviceIOProcID?
    private var timer: DispatchSourceTimer?
    private let queue = DispatchQueue(label: "org.darkroom.horizon-pulse.envelope", qos: .userInitiated)

    func start() throws {
        let description = CATapDescription(stereoGlobalTapButExcludeProcesses: [])
        description.name = "Horizon Pulse · system audio only"
        description.uuid = UUID()
        description.isPrivate = true
        description.muteBehavior = .unmuted
        try check(AudioHardwareCreateProcessTap(description, &tap), "Creating the system audio tap")

        var address = AudioObjectPropertyAddress(
            mSelector: kAudioTapPropertyFormat,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var format = AudioStreamBasicDescription()
        var size = UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        try check(AudioObjectGetPropertyData(tap, &address, 0, nil, &size, &format), "Reading the audio format")
        guard format.mFormatID == kAudioFormatLinearPCM,
              format.mFormatFlags & kAudioFormatFlagIsFloat != 0,
              format.mBitsPerChannel == 32,
              format.mSampleRate > 0,
              format.mChannelsPerFrame > 0,
              format.mChannelsPerFrame <= 32 else {
            throw CaptureError(description: "This output device does not expose supported Float32 system audio. Choose another audio output, then restart capture.")
        }
        let configuration: [String: Any] = [
            kAudioAggregateDeviceNameKey: "Horizon Pulse (private)",
            kAudioAggregateDeviceUIDKey: UUID().uuidString,
            kAudioAggregateDeviceIsPrivateKey: true,
            kAudioAggregateDeviceTapListKey: [[
                kAudioSubTapUIDKey: description.uuid.uuidString,
                kAudioSubTapDriftCompensationKey: true,
            ]],
        ]
        try check(AudioHardwareCreateAggregateDevice(configuration as CFDictionary, &device), "Creating the private audio device")
        let envelope = Envelope(sampleRate: format.mSampleRate, channels: Int(format.mChannelsPerFrame))
        try check(AudioDeviceCreateIOProcIDWithBlock(&ioProc, device, queue) { _, input, _, _, _ in
            let buffers = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: input))
            var channelOffset = 0
            for buffer in buffers {
                let channelCount = Int(buffer.mNumberChannels)
                defer { channelOffset += channelCount }
                guard let data = buffer.mData, channelCount > 0 else { continue }
                let samples = data.assumingMemoryBound(to: Float.self)
                let sampleCount = Int(buffer.mDataByteSize) / MemoryLayout<Float>.size
                for index in 0..<sampleCount {
                    envelope.consume(Double(samples[index]), channel: channelOffset + index % channelCount)
                }
            }
        }, "Connecting the audio analyzer")
        try check(AudioDeviceStart(device, ioProc), "Starting system audio")
        emit(["type": "ready"])
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now(), repeating: .milliseconds(50), leeway: .milliseconds(5))
        timer.setEventHandler { emit(["type": "levels", "levels": envelope.snapshot()]) }
        timer.resume()
        self.timer = timer
    }

    func stop() {
        timer?.cancel()
        timer = nil
        if let ioProc {
            AudioDeviceStop(device, ioProc)
            AudioDeviceDestroyIOProcID(device, ioProc)
            self.ioProc = nil
        }
        if device != kAudioObjectUnknown {
            AudioHardwareDestroyAggregateDevice(device)
            device = AudioObjectID(kAudioObjectUnknown)
        }
        if tap != kAudioObjectUnknown {
            AudioHardwareDestroyProcessTap(tap)
            tap = AudioObjectID(kAudioObjectUnknown)
        }
    }
}

// Hardware-free tests exercise silence, band separation, invalid samples, and reset.
func selfTest() {
    let keys = ["bass", "mid", "treble"]
    for (index, frequency) in [70.0, 700.0, 8_000.0].enumerated() {
        let envelope = Envelope(sampleRate: 48_000, channels: 2)
        for frame in 0..<24_000 {
            let value = 0.1 * sin(2 * .pi * frequency * Double(frame) / 48_000)
            envelope.consume(value, channel: 0)
            envelope.consume(-value, channel: 1) // Opposite channels must not cancel.
        }
        let bands = envelope.snapshot()
        guard let dominant = keys.max(by: { bands[$0]! < bands[$1]! }), dominant == keys[index] else {
            fputs("Frequency separation failed\n", stderr); exit(1)
        }
        precondition(envelope.snapshot().values.allSatisfy { $0 == 0 })
        envelope.consume(.nan, channel: 0)
        envelope.consume(.infinity, channel: 1)
        precondition(envelope.snapshot().values.allSatisfy { $0 == 0 })
    }
    print("Native DSP tests passed: silence, reset, stereo energy, and three frequency bands.")
}

if CommandLine.arguments.contains("--self-test") {
    selfTest()
    exit(0)
}

// Broken pipes and parent exit cannot leave system capture running.
signal(SIGPIPE, SIG_IGN)
signal(SIGTERM, SIG_IGN)
signal(SIGINT, SIG_IGN)
if #available(macOS 14.2, *) {
    let audio = SystemAudio()
    let terminate = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    let interrupt = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
    let finish: () -> Void = { audio.stop(); exit(0) }
    terminate.setEventHandler(handler: finish)
    interrupt.setEventHandler(handler: finish)
    terminate.resume()
    interrupt.resume()
    DispatchQueue.global(qos: .utility).async {
        while readLine() != nil {}
        DispatchQueue.main.async(execute: finish)
    }
    do {
        try audio.start()
        dispatchMain()
    } catch {
        audio.stop()
        emit(["type": "error", "message": String(describing: error)])
        exit(1)
    }
} else {
    emit(["type": "error", "message": "System audio capture requires macOS 14.2 or later."])
    exit(1)
}
