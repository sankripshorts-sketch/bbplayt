import Foundation
import UIKit

class GreenLineBottomTextField: UITextField {
    
    private let bottomLine = CALayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    func setupUI() {
        textColor = .white
        borderStyle = .none
        setupBottomLine()
    }
    
    private func setupBottomLine() {
        bottomLine.backgroundColor = Color.activeBorderTextField()?.cgColor
        layer.addSublayer(bottomLine)
    }
    
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return CGRect(x: bounds.origin.x, y: bounds.origin.y, width: bounds.width, height: bounds.height - 13.scale())
    }

    override func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        return CGRect(x: bounds.origin.x, y: bounds.origin.y, width: bounds.width, height: 32.scale())
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        bottomLine.frame = CGRect(x: 0.0, y: frame.height - 2.scale(), width: frame.width, height: 2.scale())
    }
}

