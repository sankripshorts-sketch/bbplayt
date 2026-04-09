import Foundation
import UIKit

class ReplenishTextField: GreenLineBottomTextField {
    
    private var valueAction: ((Bool) -> Void)?
    
    override func setupUI() {
        super.setupUI()
        font = Font.dinRoundProBold(size: 32.scale())
        keyboardType = .numberPad
        super.addTarget(self, action: #selector(valueChanged), for: .allEvents)
    }
    
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return CGRect(x: bounds.origin.x, y: bounds.origin.y, width: bounds.width, height: bounds.height - 19.scale())
    }
    
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(UIResponderStandardEditActions.paste(_:)) {
            return false
        }
        return super.canPerformAction(action, withSender: sender)
    }
    
    @objc private func valueChanged() {
        guard let text = text, !text.isEmpty else {
            valueAction?(false)
            return
        }
        
        valueAction?(true)
    }
}

extension ReplenishTextField {
    func setAction(_ action: @escaping (Bool) -> Void) {
        self.valueAction = action
    }
}
