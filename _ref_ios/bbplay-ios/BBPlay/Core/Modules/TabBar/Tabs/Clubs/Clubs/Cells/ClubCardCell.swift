import Foundation
import SnapKit

final class ClubCardCell: BaseCollectionCell {
    
    private var openMapAction: EmptyClosure?
    private var phoneCallAction: EmptyClosure?
    private var openSocialAction: EmptyClosure?
    
    private let clubCardBackground = UIImageView()
    private let nameClub = UILabel()
    private let clubInfoStackView = UIStackView()
    private let adressView = InfoViewWithIcon()
    private let phoneView = InfoViewWithIcon()
    private let socialView = InfoViewWithIcon()
    
    override func setupUI() {
        setupClubCardBackground()
        setupNameClub()
        
        setupClubInfoStackView()
        setupAddressView()
        setupTelephoneView()
        setupSocialView()
        
        setHoverAction()
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        updateShadow()
    }
}

// MARK: - Update -
extension ClubCardCell {
    func update(with info: ClubModel) {
        clubCardBackground.image = info.background
        adressView.updateDescription(info.adress)
        phoneView.updateDescription(info.phone)
        socialView.updateDescription(info.socialLink)

        openMapAction = info.mapAction
        phoneCallAction = info.phoneAction
        openSocialAction = info.socialAction
        
    }
}

// MARK: - Private -
private extension ClubCardCell {
    func updateShadow() {
        contentView.layer.shadowColor = UIColor.black.cgColor
        contentView.layer.shadowOffset = CGSize(width: 0, height: 4.scale())
        contentView.layer.shadowRadius = 12
        contentView.layer.shadowOpacity = 0.16
        contentView.layer.shadowPath = UIBezierPath(roundedRect: contentView.bounds, cornerRadius: 8).cgPath
    }
    
    func setupClubCardBackground() {
        contentView.addSubview(clubCardBackground)

        clubCardBackground.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    func setupNameClub() {
        nameClub.text = Localizable.nameClub()
        nameClub.font = Font.dinRoundProBold(size: 28)
        nameClub.textColor = .white
        contentView.addSubview(nameClub)
        
        nameClub.snp.makeConstraints {
            $0.top.equalToSuperview().inset(57.scale())
            $0.left.equalToSuperview().inset(19.scale())
            $0.height.equalTo(36.scale())
        }
    }
    
    func setupClubInfoStackView() {
        clubInfoStackView.axis = .vertical
        clubInfoStackView.spacing = 0
        clubInfoStackView.distribution = .fillProportionally
        contentView.addSubview(clubInfoStackView)
        
        clubInfoStackView.snp.makeConstraints {
            $0.top.equalTo(nameClub.snp.bottom).offset(1.scale())
            $0.bottom.equalToSuperview().inset(8.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    func setupAddressView() {
        adressView.configure(title: Localizable.adress(),
                             icon: Image.maps())
        adressView.setAction(target: self, action: #selector(locationSearch))
        clubInfoStackView.addArrangedSubview(adressView)
    }
    
    func setupTelephoneView() {
        phoneView.configure(title: Localizable.phone(),
                            icon: Image.phone())
        phoneView.setAction(target: self, action: #selector(phoneCall))
        clubInfoStackView.addArrangedSubview(phoneView)
    }
    
    func setupSocialView() {
        socialView.configure(
            title: Localizable.socialMedia(),
            icon: Image.vkontakte(),
            dividerIsHidden: true)
        socialView.setAction(target: self, action: #selector(openSocial))
        clubInfoStackView.addArrangedSubview(socialView)
    }
}


// MARK: - Actions -
private extension ClubCardCell {
    @objc func locationSearch() {
        openMapAction?()
    }
    
    @objc func phoneCall() {
        phoneCallAction?()
    }
    
    @objc func openSocial() {
        openSocialAction?()
    }
    
    func setHoverAction() {
        adressView.setActionButton { [weak self] in
            self?.openMapAction?()
        }
        
        phoneView.setActionButton { [weak self] in
            self?.phoneCallAction?()
        }
        
        socialView.setActionButton { [weak self] in
            self?.openSocialAction?()
        }
    }
}
