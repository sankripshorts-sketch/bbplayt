import Foundation
import SnapKit
import UIKit

enum ContentLoaderState {
    case on, off
}

final class ContentLoader: UIView {
    
    private let logo = UIImageView(image: Image.logo())
    private let indicator = ActivityIndicator(colors: [.white], lineWidth: 6.scale())

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }

    private func setupUI() {
        alpha = 0
        isUserInteractionEnabled = true
        backgroundColor = Color.background()
        
        addSubview(logo)
        logo.snp.makeConstraints {
            $0.centerX.equalToSuperview().inset(64.scale())
            $0.top.equalToSuperview().inset(174.scale())
            $0.height.equalTo(96)
        }

        addSubview(indicator)
        indicator.snp.makeConstraints {
            $0.centerX.equalToSuperview()
            $0.bottom.equalToSuperview().inset(UIView.safeAreaBottom + 82.scale())
            $0.size.equalTo(48.scale())
        }
    }
    
    override func didMoveToWindow() {
        super.didMoveToWindow()
        guard window != nil else {
            indicator.isAnimating = false
            return
        }
        indicator.isAnimating = true
    }
}

// MARK: - Public
extension ContentLoader {
    func loaderOn() {
        show()
        indicator.isAnimating = true
    }

    func loaderOff() {
        hide()
        indicator.isAnimating = false
    }

    func updateAnimationINeeded() {
        guard indicator.isAnimating else { return }
        indicator.isAnimating = true
    }
}

extension ContentLoader {
    func show() {
        UIView.animate(withDuration: 0.0, animations: {
            self.alpha = 1
        })
    }

    func hide() {
        UIView.animate(withDuration: 0.2, animations: {
            self.alpha = 0
        })
    }
}
