import Foundation
import SnapKit

final class InfoViewWithIcon: UIView {
    
    private var actionImage: EmptyClosure?
    
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let imageView = UIImageView()
    private let divider = UIView()
    
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
        setupTitle()
        setupImage()
        setupDescription()
        setupDivider()
    }
    
    private func setupTitle() {
        titleLabel.textColor = Color.commonText()
        titleLabel.font = Font.dinRoundProBold(size: 12.scale())
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(9.scale())
            $0.left.equalToSuperview().inset(19.scale())
            $0.height.equalTo(12.scale())
        }
    }
    
    private func setupImage() {
        imageView.isUserInteractionEnabled = true
        
        addSubview(imageView)
        imageView.snp.makeConstraints {
            $0.right.equalToSuperview().inset(20.scale())
            $0.centerY.equalToSuperview()
            $0.size.equalTo(24.scale())
        }
    }
    
    private func setupDescription() {
        descriptionLabel.textColor = .white
        descriptionLabel.adjustsFontSizeToFitWidth = true
        descriptionLabel.font = Font.dinRoundProMedi(size: 16.scale())
        
        addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom)
            $0.left.equalToSuperview().inset(19.scale())
            $0.right.equalTo(imageView.snp.left).offset(-5.scale())
            $0.height.equalTo(24.scale())
        }
    }
    
    private func setupDivider() {
        divider.backgroundColor = Color.clubCardDivider()
        divider.layer.cornerRadius = 0.5
        
        addSubview(divider)
        divider.snp.makeConstraints {
            $0.height.equalTo(1)
            $0.top.equalTo(descriptionLabel.snp.bottom).offset(10.scale())
            $0.left.right.equalToSuperview().inset(19.scale())
        }
    }
    
    func configure(title: String,
                   description: String? = nil,
                   icon: UIImage? = nil,
                   dividerIsHidden: Bool = false) {
        titleLabel.text = title
        descriptionLabel.text = description
        imageView.image = icon?.withTintColor(Color.commonText()!)
        divider.isHidden = dividerIsHidden
        
    }
    
    func setAction(target: Any, action: Selector) {
        let tap = UITapGestureRecognizer(target: target, action: action)
        addGestureRecognizer(tap)
        
        let tapHover = UILongPressGestureRecognizer(target: self, action: #selector(buttonLongTap))
        tapHover.minimumPressDuration = 0.01
        imageView.addGestureRecognizer(tapHover)
    }
    
    func updateDescription(_ text: String) {
        descriptionLabel.text = text
    }
    
    
    func setActionButton(_ action: @escaping EmptyClosure) {
        actionImage = action
    }
    
    @objc private func buttonLongTap(_ sender: UIGestureRecognizer) {
        if sender.state == .began {
            imageView.alpha = 0.7
        }
        else if sender.state == .ended {
            imageView.alpha = 1
            self.actionImage?()

        }
        else if sender.state == .cancelled || sender.state == .failed {
            imageView.alpha = 1
        }
    }
}

