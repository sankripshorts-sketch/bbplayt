import Foundation
import UIKit

class PhoneCall {
    func call(number: String) {
        setupPhoneCall(number: number)
    }
    
    private func setupPhoneCall(number: String) {
        guard let url = URL(string: "tel://\(number.removeIncorrectSymbols())"),
              UIApplication.shared.canOpenURL(url) else {
            return
        }
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }
}

private extension String {
    func removeIncorrectSymbols() -> String {
        let whiteList = ["0":"0",
                         "1":"1",
                         "2":"2",
                         "3":"3",
                         "4":"4",
                         "5":"5",
                         "6":"6",
                         "7":"7",
                         "8":"8",
                         "9":"9",
                         "+":"+"]
        var correctPhoneString = ""
        for symbol in self {
            if let symbol = whiteList[String(symbol)] {
                correctPhoneString += symbol
            }
        }
        return correctPhoneString
    }
}
