import Foundation
import SnapKit
import SkeletonView

final class ProfileViewImpl: UIView {
    
    private var bonusRublesAction: EmptyClosure?
    private var leaderboardAction: EmptyClosure?
    private var refreshAction: EmptyClosure?
    
    private let activity = UIActivityIndicatorView()
    
    private let logo = UIImageView()
    private let greetingLabel = UILabel()
    
    // https://3.basecamp.com/3092879/buckets/31819166/todos/6299292475
//    private let cupView = UIView()
//
//    private let leaderboardContainer = UIView()
//    private let arrowsImageView = UIImageView()
//    private let leaderboardLabel = UILabel()

    private let cupContainer = UIView()
    private let cupTitleLabel = UILabel()
    private let cupImageView = UIImageView()
    private let cupCountLabel = UILabel()

    private let infoBannerView = InfoBannerView()

    private let balanceView = UIView()

    private let balanceContainer = UIView()
    private let balanceLabel = UILabel()
    private let balanceCount = UILabel()
    
//    private let bonusRubsContainer = UIView()
//    private let bonusRubsLabel = UILabel()
//    private let bonusRubsInfo = UIImageView()
//    private let iconBonusBalance = UIImageView()
//    private let bonusBalanceCount = UILabel()
    
    private let depositButton = MainButton()
    
    private let sceleton = ProfileSceletonView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        updateShadow()
    }
}

// MARK: - Private extension -
private extension ProfileViewImpl {
    func setupUI() {
        isUserInteractionEnabled = true
        backgroundColor = Color.background()

        addSubviews()
        setupLogo()
        setupGreetingLabel()
//        setupCupView()
//        setupCupContainer()
//        setupCupTitleLabel()
//        setupCupImageView()
//        setupCupCountLabel()
//        setupLeaderboardView()
//        setupArrowsImageView()
//        setupLeaderboardLabel()

        setupBalanceView()
        setupBalanceContainer()
        setupBalanceLabel()
        setupBalanceCount()
        
//        setupBonusRubsContainer()
//        setupBonusRubsInfo()
//        setupBonusRubsLabel()
//        setupIconBonusBalance()
//        setupBonusBalanceCount()
        setupButton()
        
        setupSceleton()
        setupPullToRefresh()
    }
    
    func updateShadow() {
//        cupView.layer.shadowColor = UIColor.black.cgColor
//        cupView.layer.shadowOffset = CGSize(width: 0, height: 4.scale())
//        cupView.layer.shadowRadius = 12
//        cupView.layer.shadowOpacity = 0.16
//        cupView.layer.shadowPath = UIBezierPath(roundedRect: cupView.bounds, cornerRadius: 8).cgPath
        
//        infoBannerView.layer.shadowColor = UIColor.black.cgColor
//        infoBannerView.layer.shadowOffset = CGSize(width: 0, height: 4.scale())
//        infoBannerView.layer.shadowRadius = 12
//        infoBannerView.layer.shadowOpacity = 0.16
//        infoBannerView.layer.shadowPath = UIBezierPath(roundedRect: infoBannerView.bounds, cornerRadius: 8).cgPath
        
        balanceView.layer.shadowColor = UIColor.black.cgColor
        balanceView.layer.shadowOffset = CGSize(width: 0, height: 4.scale())
        balanceView.layer.shadowRadius = 12
        balanceView.layer.shadowOpacity = 0.16
        balanceView.layer.shadowPath = UIBezierPath(roundedRect: balanceView.bounds, cornerRadius: 8).cgPath
    }
    
    func addSubviews() {
        addSubview(activity)
        addSubview(logo)
        addSubview(greetingLabel)
        
        
//        addSubview(cupView)
//        cupView.addSubview(cupContainer)
//        cupContainer.addSubview(cupTitleLabel)
//        cupContainer.addSubview(cupImageView)
//        cupContainer.addSubview(cupCountLabel)
//
//        cupView.addSubview(leaderboardContainer)
//        leaderboardContainer.addSubview(arrowsImageView)
//        leaderboardContainer.addSubview(leaderboardLabel)

        addSubview(balanceView)
        balanceView.addSubview(balanceContainer)
        balanceContainer.addSubview(balanceLabel)
        balanceContainer.addSubview(balanceCount)
        
        balanceView.addSubview(depositButton)
        
        addSubview(sceleton)
    }
    
    func setupPullToRefresh() {
        activity.style = .large
      
        activity.snp.makeConstraints {
            $0.centerX.equalToSuperview()
            $0.top.equalTo(logo.snp.bottom).offset(50.scale())
        }
        
        let swipe = UISwipeGestureRecognizer(target: self, action: #selector(refresh))
        swipe.direction = .down
        addGestureRecognizer(swipe)
    }
    
    func setupLogo() {
        logo.image = Image.logo()

        logo.snp.makeConstraints {
            $0.top.equalToSuperview().inset(68.scale())
            $0.centerX.equalToSuperview()
            $0.width.equalTo(125.scale())
            $0.height.equalTo(49.scale())
        }
    }

    func setupGreetingLabel() {
        greetingLabel.adjustsFontSizeToFitWidth = true
        
        greetingLabel.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(balanceView.snp.top).offset(-24.scale())
            $0.height.equalTo(28.scale())
        }
    }
    
    //    private func setupCupView() {
    //        cupView.backgroundColor = Color.profileViewBackground()
    //
    //        cupView.snp.makeConstraints {
    //            $0.left.right.equalToSuperview().inset(24.scale())
    //            $0.bottom.equalTo(balanceView.snp.top).offset(-24.scale())
    //        }
    //    }
        
    //    private func setupCupContainer() {
    //        cupView.layer.cornerRadius = 8
    //
    //        cupContainer.snp.makeConstraints {
    //            $0.left.top.bottom.equalToSuperview().inset(24.scale())
    //        }
    //    }
        
    //    private func setupCupTitleLabel() {
    //        cupTitleLabel.text = Localizable.cups()
    //        cupTitleLabel.font = Font.dinRoundProBold(size: 16.scale())
    //        cupTitleLabel.textColor = Color.commonText()
    //
    //        cupTitleLabel.snp.makeConstraints {
    //            $0.top.left.right.equalToSuperview()
    //            $0.height.equalTo(24.scale())
    //        }
    //    }
    //
    //    private func setupCupImageView() {
    //        cupImageView.image = Image.cup()
    //
    //        cupImageView.snp.makeConstraints {
    //            $0.top.equalTo(cupTitleLabel.snp.bottom).offset(10.scale())
    //            $0.left.equalToSuperview()
    //            $0.bottom.equalToSuperview().inset(2.scale())
    //            $0.size.equalTo(24.scale())
    //        }
    //    }
    //
    //    private func setupCupCountLabel() {
    //        cupCountLabel.font = Font.dinRoundProBold(size: 32.scale())
    //        cupCountLabel.textColor = Color.commonText()
    //
    //        cupCountLabel.snp.makeConstraints {
    //            $0.top.equalTo(cupTitleLabel.snp.bottom).offset(4.scale())
    //            $0.left.equalTo(cupImageView.snp.right).offset(8.scale())
    //            $0.right.equalToSuperview()
    //            $0.height.equalTo(32.scale())
    //        }
    //    }

    //    private func setupLeaderboardView() {
    //        leaderboardContainer.isUserInteractionEnabled = true
    //        let tap = UITapGestureRecognizer(target: self, action: #selector(leaderboardTap))
    //        leaderboardContainer.addGestureRecognizer(tap)
    //
    //        leaderboardContainer.snp.makeConstraints {
    //            $0.centerY.equalToSuperview()
    //            $0.left.equalTo(cupContainer.snp.right).offset(138.scale())
    //            $0.right.equalToSuperview().inset(24.scale())
    //        }
    //    }

    //    private func setupArrowsImageView() {
    //        arrowsImageView.image = Image.arrow()
    //
    //        arrowsImageView.snp.makeConstraints {
    //            $0.top.right.bottom.equalToSuperview()
    //            $0.size.equalTo(32.scale())
    //        }
    //    }

    //    private func setupLeaderboardLabel() {
    //        let paragraphStyle = NSMutableParagraphStyle()
    //        paragraphStyle.lineHeightMultiple = 0.78
    //        paragraphStyle.lineBreakMode = .byClipping
    //        paragraphStyle.minimumLineHeight = 16.scale()
    //        paragraphStyle.maximumLineHeight = 16.scale()
    //
    //        leaderboardLabel.numberOfLines = 0
    //
    //        leaderboardLabel.attributedText = NSAttributedString(
    //            string: Localizable.leaderboard(),
    //            attributes: [
    //                .paragraphStyle: paragraphStyle,
    //                .font: Font.dinRoundProBold(size: 16.scale())!,
    //                .foregroundColor: UIColor.white
    //            ])
    //
    //        leaderboardLabel.snp.makeConstraints {
    //            $0.centerY.equalToSuperview()
    //            $0.right.equalTo(arrowsImageView.snp.left).offset(-8.scale())
    //        }
    //    }
    
    func setupInfoBannerView() {
        infoBannerView.backgroundColor = Color.profileViewBackground()
        infoBannerView.layer.cornerRadius = 8
        
        infoBannerView.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(balanceView.snp.top).offset(-14.scale())
        }
    }
    
    func setupBalanceView() {
        balanceView.backgroundColor = Color.profileViewBackground()
        balanceView.layer.cornerRadius = 8

        balanceView.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(safeAreaLayoutGuide.snp.bottom).offset(-32.scale())
        }
    }

    func setupBalanceContainer() {
        balanceContainer.snp.makeConstraints {
            $0.top.left.equalToSuperview().inset(24.scale())
        }
    }

    func setupBalanceLabel() {
        balanceLabel.text = Localizable.balance()
        balanceLabel.font = Font.dinRoundProBold(size: 16.scale())
        balanceLabel.textColor = Color.commonText()

        balanceLabel.snp.makeConstraints {
            $0.top.left.right.equalToSuperview()
            $0.height.equalTo(24.scale())
        }
    }

    func setupBalanceCount() {
        balanceCount.snp.makeConstraints {
            $0.top.equalTo(balanceLabel.snp.bottom).offset(4.scale())
            $0.left.right.bottom.equalToSuperview()
            $0.height.equalTo(32.scale())
        }
    }
    
    //    private func setupBonusRubsContainer() {
    //        bonusRubsContainer.isHidden = true
    //        balanceView.addSubview(bonusRubsContainer)
    //        let tap = UITapGestureRecognizer(target: self, action: #selector(bonusRublesInfoTap))
    //        bonusRubsContainer.addGestureRecognizer(tap)
    //
    //        bonusRubsContainer.snp.makeConstraints {
    //            $0.top.equalTo(balanceContainer.snp.bottom).offset(16.scale())
    //            $0.left.equalToSuperview().inset(24.scale())
    //        }
    //    }

    //    private func setupBonusRubsInfo() {
    //        bonusRubsInfo.isUserInteractionEnabled = true
    //        bonusRubsInfo.image = Image.balanceInfo()
    //
    //        bonusRubsContainer.addSubview(bonusRubsInfo)
    //        bonusRubsInfo.snp.makeConstraints {
    //            $0.top.equalToSuperview().inset(6.scale())
    //            $0.right.equalToSuperview()
    //            $0.size.equalTo(16.scale())
    //        }
    //    }
    //
    //    private func setupBonusRubsLabel() {
    //        bonusRubsLabel.text = Localizable.bonusRubles()
    //        bonusRubsLabel.textColor = Color.commonText()
    //        bonusRubsLabel.font = Font.dinRoundProBold(size: 16.scale())
    //
    //        bonusRubsContainer.addSubview(bonusRubsLabel)
    //        bonusRubsLabel.snp.makeConstraints {
    //            $0.top.left.equalToSuperview()
    //            $0.right.equalTo(bonusRubsInfo.snp.left).inset(-5.scale())
    //            $0.height.equalTo(24.scale())
    //        }
    //    }
    //
    //    private func setupIconBonusBalance() {
    //        iconBonusBalance.image = Image.iconBonusBalance()
    //        bonusRubsContainer.addSubview(iconBonusBalance)
    //
    //        iconBonusBalance.snp.makeConstraints {
    //            $0.top.equalTo(bonusRubsLabel.snp.bottom).offset(10.scale())
    //            $0.left.equalToSuperview()
    //            $0.size.equalTo(24.scale())
    //            $0.bottom.equalToSuperview().inset(2.scale())
    //        }
    //    }
    //
    //    private func setupBonusBalanceCount() {
    //        bonusBalanceCount.font = Font.dinRoundProBold(size: 32.scale())
    //        bonusBalanceCount.textColor = Color.commonText()
    //
    //        bonusRubsContainer.addSubview(bonusBalanceCount)
    //        bonusBalanceCount.snp.makeConstraints {
    //            $0.top.equalTo(bonusRubsLabel.snp.bottom).offset(4.scale())
    //            $0.left.equalTo(iconBonusBalance.snp.right).offset(8.scale())
    //            $0.bottom.equalToSuperview()
    //        }
    //    }
    
    func setupButton() {
        depositButton.configure(title: Localizable.replenish())
        depositButton.setCorners(masks: [.layerMaxXMaxYCorner, .layerMinXMaxYCorner])
        
        depositButton.snp.makeConstraints {
            $0.height.equalTo(58.scale())
            $0.top.equalTo(balanceCount.snp.bottom).offset(24.scale())
            $0.left.right.equalTo(balanceView)
            $0.bottom.equalToSuperview()
        }
    }
    
    func setupSceleton() {
        
        sceleton.snp.makeConstraints {
            $0.top.equalTo(greetingLabel.snp.top)
            $0.bottom.equalTo(balanceView.snp.bottom)
            $0.left.right.equalToSuperview()
        }
    }
    
    func setupGreetingTitle(with name: String) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 26.scale()
        paragraphStyle.maximumLineHeight = 26.scale()
        
        greetingLabel.attributedText = NSAttributedString(
            string: Localizable.hello(name),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraphStyle
            ])
    }
    
    func setupBalanceCount(with count: String) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 32.scale()
        paragraphStyle.maximumLineHeight = 32.scale()
        
        balanceCount.attributedText = NSAttributedString(
            string: count,
            attributes: [
                .font: Font.dinRoundProBold(size: 32.scale())!,
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraphStyle
            ])
    }
    
    @objc func bonusRublesInfoTap() {
        bonusRublesAction?()
    }
    
    @objc func leaderboardTap() {
        leaderboardAction?()
    }
    
    @objc func refresh() {
        refreshAction?()
        activity.startAnimating()
    }
    
    func showInfoBannerIfNeeded() {
        addSubview(infoBannerView)
        setupInfoBannerView()
        
        greetingLabel.snp.remakeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(infoBannerView.snp.top).offset(-24.scale())
            $0.height.equalTo(28.scale())
        }
    }
    
    func removeInfoBannerIfNeeded() {
        infoBannerView.removeFromSuperview()
        
        greetingLabel.snp.remakeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalTo(balanceView.snp.top).offset(-24.scale())
            $0.height.equalTo(28.scale())
        }
    }
}

// MARK: - Public -
extension ProfileViewImpl {
    func setLeaderbordAction(_ action: @escaping EmptyClosure) {
        self.leaderboardAction = action
    }
    
    func setBonusRublesAction(_ action: @escaping EmptyClosure) {
        self.bonusRublesAction = action
    }
    
    func setDepositButtonAction(_ action: @escaping EmptyClosure) {
        depositButton.setActionButton(action)
    }
    
    func setRefreshAction(_ action: @escaping EmptyClosure) {
        self.refreshAction = action
    }
    
    func update(with account: Account) {
        setupGreetingTitle(with: account.memberNickname)
        cupCountLabel.text = account.memberCoinBalance
        setupBalanceCount(with: Localizable.rub(account.memberBalance))
//        bonusBalanceCount.text = account.memberBalanceBonus
        
        if account.isFirstPayment {
            showInfoBannerIfNeeded()
        } else {
            removeInfoBannerIfNeeded()
        }
    }
    
    func sceletonShow() {
        sceleton.sceletonShow()
        sceleton.isHidden = false
    }
    
    func sceletonHide() {
        sceleton.sceletonHide()
        sceleton.isHidden = true
    }
    
    func endRefresh() {
        activity.stopAnimating()
    }
}
