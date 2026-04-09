import Foundation
import SnapKit

final class SelectedView: UIView {
    
    private let titleLabel = UILabel()
    private let contentLabel = UILabel()
    private let iconImageView = UIImageView()
    private let arrowImageView = UIImageView()
    
    private var action: EmptyClosure?
    
    private var state: ViewState! {
        willSet {
            updateView(with: newValue)
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAppearance()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }
    
    func setAction(_ action: @escaping EmptyClosure) {
        self.action = action
    }
    
    func setup(with type: ViewType) {
        switch type {
            case .club:
                titleLabel.text = Localizable.selectClub()
                iconImageView.image = Image.reservationLocation()!
            case .date:
                titleLabel.text = Localizable.selectDate()
                iconImageView.image = Image.reservationTimeCalendar()
            case .time:
                titleLabel.text = Localizable.selectTime()
                iconImageView.image = Image.reservationClock()
        }
    }
    
    func updateView(with text: String) {
        contentLabel.text = text
        state = .haveSelected
    }
    
    func updateStateView(with state: ViewState) {
        self.state = state
    }
    
    // MARK: - Private
    private func setupAppearance() {
        addGestureRecognizer(
            UITapGestureRecognizer(target: self, action: #selector(tapHandler))
        )

        backgroundColor = Color.selectedViewBackground()!
        layer.cornerRadius = 8
        
        arrowImageView.image = Image.reservationArrow()!
        
        addSubview(arrowImageView)
        arrowImageView.snp.makeConstraints {
            $0.right.equalToSuperview().inset(19.scale())
            $0.centerY.equalToSuperview()
        }
        
        addSubview(iconImageView)
        iconImageView.snp.makeConstraints {
            $0.left.equalToSuperview().inset(19.scale())
            $0.centerY.equalToSuperview()
        }
        
        titleLabel.font = Font.dinRoundProMedi(size: 20.scale())
        titleLabel.textColor = .white
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.left.equalTo(iconImageView.snp.right).offset(19.scale())
            $0.centerY.equalToSuperview()
        }
        
        contentLabel.font = Font.dinRoundProBold(size: 16.scale())
        addSubview(contentLabel)
        
        state = .inactive
    }
    
    func updateLabels() {
        titleLabel.font = Font.dinRoundProMedi(size: 14.scale())
        
        titleLabel.snp.remakeConstraints {
            $0.left.equalTo(iconImageView.snp.right).offset(19.scale())
            $0.top.equalToSuperview().inset(9.scale())
            $0.height.equalTo(18.scale())
        }
        
        contentLabel.snp.remakeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom)
            $0.left.equalTo(titleLabel.snp.left)
            $0.bottom.equalToSuperview().inset(8.scale())
            $0.height.equalTo(24.scale())
        }
    }
    
    func updateView(with state: ViewState) {
        switch state {
            case .active:
                isUserInteractionEnabled = true
                titleLabel.textColor = .white
                iconImageView.tintColor = .white
                arrowImageView.tintColor = .white
            case .inactive:
                isUserInteractionEnabled = false
                titleLabel.textColor = Color.selectedViewUnavailableText()!
                iconImageView.tintColor = Color.selectedViewUnavailableText()!
                arrowImageView.tintColor = Color.selectedViewUnavailableText()!
            case .haveSelected:
                isUserInteractionEnabled = true
                titleLabel.textColor = Color.selectedViewGreenText()!
                iconImageView.tintColor = .white
                arrowImageView.tintColor = .white
                updateLabels()
            case .deselected:
                isUserInteractionEnabled = true
                titleLabel.textColor = .white
                iconImageView.tintColor = .white
                arrowImageView.tintColor = .white
                makeDeselectConstraints()
                
                contentLabel.text = nil
                titleLabel.font = Font.dinRoundProMedi(size: 20.scale())
        }
    }
    
    func makeDeselectConstraints() {
        titleLabel.snp.removeConstraints()
        contentLabel.snp.removeConstraints()
        
        titleLabel.snp.makeConstraints {
            $0.left.equalTo(iconImageView.snp.right).offset(19.scale())
            $0.centerY.equalToSuperview()
        }
    }
    
    @objc func tapHandler() {
        action?()
    }
}

// MARK: - ViewType -
extension SelectedView {
    enum ViewType {
        case club
        case date
        case time
    }
}

// MARK: - ViewState -
extension SelectedView {
    enum ViewState {
        case active
        case inactive
        case haveSelected
        case deselected
    }
}
