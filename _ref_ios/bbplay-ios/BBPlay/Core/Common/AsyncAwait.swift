import Foundation

public let DEFAULT_WAIT_TIME: TimeInterval = 2

public func wait(sec seconds: TimeInterval) async {
    if #available(iOS 16.0, *) {
        do { try await Task.sleep(for: Duration.seconds(seconds)) }
        catch { return }
    } else {
        async let timer = Timer.scheduledTimer(
            withTimeInterval: seconds,
            repeats: false) { timer in return }
        await timer.fire()
    }
}
