import Foundation
import SnapKit

enum PaymentState {
    case loading
    case success
    case pending
    case error
}

final class ReplenishStatusOrderBottomSheet: BaseBottomSheetController {
    
    private let activityIndicator = ActivityIndicator(colors: [.white], lineWidth: 6.scale())
    private let clockImageView = UIImageView()
    private let titleLabel = UILabel()
    private let descriptionSubtitle = UILabel()
    private let button = MainButton()
    
    private var state: PaymentState {
        didSet {
            updateView()
        }
    }
    
    private var action: EmptyClosure?
    
    init(state: PaymentState,
         action: EmptyClosure? = nil) {
        self.state = state
        self.action = action
        super.init(with: 411.scale())
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !activityIndicator.isHidden else { return }
        activityIndicator.isAnimating = true
    }
    
    override func setupUI() {
        super.setupUI()
        setupActivityIndicator()
        setupClockImageView()
        setupTitle()
        setupDescriptionSubtitle()
        setupButton()
        
        // Нужно чтобы сработал didSet
        updateState(with: state)
    }
    
    private func setupActivityIndicator() {
        contentView.addSubview(activityIndicator)
        
        activityIndicator.snp.makeConstraints {
            $0.top.equalToSuperview().inset(61.scale())
            $0.centerX.equalToSuperview()
            $0.size.equalTo(48.scale())
        }
    }
    
    private func setupClockImageView() {
        contentView.addSubview(clockImageView)
        clockImageView.snp.makeConstraints {
            $0.top.equalToSuperview().inset(53.scale())
            $0.centerX.equalToSuperview()
            $0.size.equalTo(64.scale())
        }
    }
    
    private func setupTitle() {
        titleLabel.numberOfLines = 2
        
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalTo(clockImageView.snp.bottom).offset(16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(56.scale())
        }
    }
    
    private func setupDescriptionSubtitle() {
        descriptionSubtitle.numberOfLines = 2
        
        contentView.addSubview(descriptionSubtitle)
        descriptionSubtitle.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(40.scale())
        }
    }
    
    private func setupButton() {
        button.configure(title: Localizable.okey())
        button.setActionButton { [weak self] in
            self?.dismiss(animated: true) {
                self?.action?()
            }
        }
        
        contentView.addSubview(button)
        button.snp.makeConstraints {
            $0.top.equalTo(descriptionSubtitle.snp.bottom).offset(32.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview().inset(43.scale() + UIView.safeAreaBottom)
            $0.height.equalTo(58.scaleIfNeeded())
        }
    }
    
    private func updateView() {
        updateImage()
        updateTitle()
        updateDescriptionSubtitle()
    }
}

// MARK: - Update state
extension ReplenishStatusOrderBottomSheet {
    func updateState(with newState: PaymentState) {
        self.state = newState
        
        if state == .loading {
            clockImageView.isHidden = true
            activityIndicator.isHidden = false
            button.setEnable(isEnabled: false)
            super.setDriverEnabled(with: false)
            
            titleLabel.snp.remakeConstraints {
                $0.top.equalTo(activityIndicator.snp.bottom).offset(24.scale())
                $0.left.right.equalToSuperview().inset(24.scale())
                $0.height.equalTo(56.scale())
            }
        }
        else {
            clockImageView.isHidden = false
            activityIndicator.isHidden = true
            activityIndicator.isAnimating = false
            button.setEnable(isEnabled: true)
            super.setDriverEnabled(with: true)
            
            titleLabel.snp.remakeConstraints {
                $0.top.equalTo(clockImageView.snp.bottom).offset(16.scale())
                $0.left.right.equalToSuperview().inset(24.scale())
                $0.height.equalTo(56.scale())
            }
        }
        UIView.animate(withDuration: 0.1, animations: { self.contentView.layoutIfNeeded()  })
        
        if state == .error {
            action = nil
        }
    }
}

// MARK: - Update view
private extension ReplenishStatusOrderBottomSheet {
    func getTitle() -> String {
        switch state {
            case .loading: return Localizable.paymentLoading()
            case .pending: return Localizable.paymentProcess()
            case .success: return Localizable.paymentSuccessProcessed()
            case .error: return Localizable.paymentNotProcessed()
        }
    }
    
    func getDescriptionSubtitle() -> String {
        switch state {
            case .loading: return Localizable.paymentLoadingDescription()
            case .pending: return Localizable.paymentProcessDescription()
            case .success: return Localizable.paymentSuccessProcessedDescription()
            case .error: return Localizable.paymentNotProcessedDescription()
        }
    }
    
    func getImage() -> UIImage {
        switch state {
            case .loading: return UIImage()
            case .pending: return Image.pendingPayment()!
            case .success: return Image.successPayment()!
            case .error: return Image.errorPayment()!
        }
    }
    
    func updateImage() {
        clockImageView.image = getImage()
    }
    
    func updateTitle() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 26.scale()
        paragraphStyle.maximumLineHeight = 26.scale()
        paragraphStyle.alignment = .center
        
        titleLabel.attributedText = NSAttributedString(
            string: getTitle(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraphStyle
            ])
    }
    
    func updateDescriptionSubtitle() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 20.scale()
        paragraphStyle.maximumLineHeight = 20.scale()
        paragraphStyle.alignment = .center
        
        descriptionSubtitle.attributedText = NSAttributedString(
            string: getDescriptionSubtitle(),
            attributes: [
                .font: Font.dinRoundProMedi(size: 20.scale())!,
                .foregroundColor: Color.commonText()!,
                .paragraphStyle: paragraphStyle
            ])
    }
}
