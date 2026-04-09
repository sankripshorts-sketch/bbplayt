import Foundation
import SnapKit
import SkeletonView

final class ProfileSceletonView: UIView {
        
    private let sceletonGradient = SkeletonGradient(baseColor: Color.sceletonColor()!)
    
    private let sceletonContainer = UIView()
    
//    private let sceletonCupView = UIView()
//    private let sceletonCupConteiner = UIView()
//    private let sceletonCupTitleLabel = UIImageView()
//    private let sceletonCupImageView = UIImageView()
//    private let sceletonCupCountLabel = UIImageView()
    
//    private let sceletonLeaderboardLabelTop = UIImageView()
//    private let sceletonLeaderboardLabelBot = UIImageView()
//    private let sceletonArrowsImageView = UIImageView()
    
    private let sceletonTitleLabel = UIView()
    private let sceletonTitleContainer = UIView()
    private let sceletonWelcome = UIImageView()
    private let sceletonNickname = UIImageView()
    
    private let sceletonBalanceView = UIView()
    private let sceletonBalanceContainer = UIView()
    private let sceletonBalanceLabel = UIImageView()
    private let sceletonBalanceCount = UIImageView()
//    private let sceletonBonusRubsLabel = UIImageView()
//    private let sceletonIconBonusBalance = UIImageView()
//    private let sceletonBonusRubsInfo = UIImageView()
    private let sceletonDepositButton = UIView()
    private let sceletonButtonTitle = UIImageView()
    
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
        setupSceletonContainer()
        
        setupSceletonTitleLabel()
        setupSceletonTitleContainer()
        setupSceletonWelcome()
        setupSceletonNickname()
//
//        setupSceletonCupView()
//        setupSceletonCupConteiner()
//        setupSceletonCupTitleLabel()
//        setupSceletonCupImageView()
//        setupSceletonCupCountLabel()
//
//        setupSceletonLeaderboardLabelTop()
//        setupSceletonLeaderboardLabelBot()
//        setupSceletonArrowsImageView()
        
        setupSceletonBalanceView()
        setupSceletonBalanceContainer()
        setupSceletonBalanceLabel()
        setupSceletonBalanceCount()
//        setupSceletonBonusRubsLabel()
//        setupSceletonIconBonusBalance()
//        setupSceletonBonusRubsInfo()
        
        sceletonSceletonDepositButton()
        setupSceletonButtonTitle()
    }
    
    private func setupSceletonContainer() {
        sceletonContainer.isSkeletonable = true
        sceletonContainer.isHidden = true
        addSubview(sceletonContainer)
        
        sceletonContainer.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupSceletonTitleLabel() {
        sceletonTitleLabel.isSkeletonable = true
        sceletonTitleLabel.backgroundColor = Color.background()
        sceletonContainer.addSubview(sceletonTitleLabel)
        
        sceletonTitleLabel.snp.makeConstraints {
            $0.top.equalToSuperview()
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(28.scale())
        }
    }
    
    private func setupSceletonTitleContainer() {
        sceletonTitleContainer.isSkeletonable = true
        sceletonTitleLabel.addSubview(sceletonTitleContainer)
        
        sceletonTitleContainer.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupSceletonWelcome() {
        sceletonWelcome.isSkeletonable = true
        sceletonWelcome.skeletonCornerRadius = 4
        sceletonTitleContainer.addSubview(sceletonWelcome)
        
        sceletonWelcome.snp.makeConstraints {
            $0.bottom.equalToSuperview()
            $0.left.equalToSuperview()
            $0.right.equalToSuperview().inset(203.scaleIfNeeded())
            $0.height.equalTo(8.scale())
        }
    }
    
    private func setupSceletonNickname() {
        sceletonNickname.isSkeletonable = true
        sceletonNickname.skeletonCornerRadius = 4
        sceletonTitleContainer.addSubview(sceletonNickname)
        
        sceletonNickname.snp.makeConstraints {
            $0.bottom.equalToSuperview()
            $0.left.equalTo(sceletonWelcome.snp.right).offset(10.scaleIfNeeded())
            $0.right.equalToSuperview().inset(119.scaleIfNeeded())
            $0.height.equalTo(8.scale())
        }
    }
    
//    private func setupSceletonCupView() {
//        sceletonCupView.isSkeletonable = true
//        sceletonCupView.backgroundColor = Color.profileViewBackground()
//        sceletonCupView.layer.cornerRadius = 8
//        sceletonContainer.addSubview(sceletonCupView)
//
//        sceletonCupView.snp.makeConstraints {
//            $0.top.equalTo(sceletonTitleContainer.snp.bottom).offset(24.scale())
//            $0.left.right.equalToSuperview().inset(24.scale())
//            $0.height.equalTo(108.scale())
//        }
//    }
    
//    private func setupSceletonCupConteiner() {
//        sceletonCupConteiner.isSkeletonable = true
//        sceletonCupConteiner.skeletonCornerRadius = 8
//        sceletonCupView.addSubview(sceletonCupConteiner)
//
//        sceletonCupConteiner.snp.makeConstraints {
//            $0.edges.equalToSuperview()
//        }
//    }
    
//    private func setupSceletonCupTitleLabel() {
//        sceletonCupTitleLabel.isSkeletonable = true
//        sceletonCupTitleLabel.skeletonCornerRadius = 4
//        sceletonCupConteiner.addSubview(sceletonCupTitleLabel)
//
//        sceletonCupTitleLabel.snp.makeConstraints {
//            $0.top.equalToSuperview().inset(24.scale())
//            $0.left.equalToSuperview().inset(24.scaleIfNeeded())
//            $0.right.equalToSuperview().inset(235.scaleIfNeeded())
//            $0.height.equalTo(8.scale())
//        }
//    }
    
//    private func setupSceletonCupImageView() {
//        sceletonCupImageView.isSkeletonable = true
//        sceletonCupImageView.skeletonCornerRadius = 12
//        sceletonCupConteiner.addSubview(sceletonCupImageView)
//
//        sceletonCupImageView.snp.makeConstraints {
//            $0.top.equalTo(sceletonCupTitleLabel.snp.bottom).offset(16.scale())
//            $0.left.equalToSuperview().inset(24.scaleIfNeeded())
//            $0.size.equalTo(24.scale())
//        }
//    }
    
//    private func setupSceletonCupCountLabel() {
//        sceletonCupCountLabel.isSkeletonable = true
//        sceletonCupCountLabel.skeletonCornerRadius = 4
//        sceletonCupConteiner.addSubview(sceletonCupCountLabel)
//
//        sceletonCupCountLabel.snp.makeConstraints {
//            $0.top.equalTo(sceletonCupTitleLabel.snp.bottom).offset(23.scale())
//            $0.left.equalTo(sceletonCupImageView.snp.right).offset(8.scaleIfNeeded())
//            $0.right.equalToSuperview().inset(221.scaleIfNeeded())
//            $0.height.equalTo(10.scale())
//        }
//    }

//    private func setupSceletonLeaderboardLabelTop() {
//        sceletonLeaderboardLabelTop.isSkeletonable = true
//        sceletonLeaderboardLabelTop.skeletonCornerRadius = 4
//        sceletonCupConteiner.addSubview(sceletonLeaderboardLabelTop)
//
//        sceletonLeaderboardLabelTop.snp.makeConstraints {
//            $0.top.equalToSuperview().inset(42.scale())
//            $0.left.equalToSuperview().inset(195.scaleIfNeeded())
//            $0.right.equalToSuperview().inset(64.scaleIfNeeded())
//            $0.height.equalTo(6.scale())
//        }
//    }
    
//    private func setupSceletonLeaderboardLabelBot() {
//        sceletonLeaderboardLabelBot.isSkeletonable = true
//        sceletonLeaderboardLabelBot.skeletonCornerRadius = 4
//        sceletonCupConteiner.addSubview(sceletonLeaderboardLabelBot)
//
//        sceletonLeaderboardLabelBot.snp.makeConstraints {
//            $0.top.equalTo(sceletonLeaderboardLabelTop.snp.bottom).offset(11.scale())
//            $0.left.equalToSuperview().inset(195.scaleIfNeeded())
//            $0.right.equalToSuperview().inset(64.scaleIfNeeded())
//            $0.height.equalTo(6.scale())
//        }
//    }
    
//    private func setupSceletonArrowsImageView() {
//        sceletonArrowsImageView.image = Image.arrow()?.withTintColor(Color.sceletonColor()!, renderingMode: .alwaysOriginal)
//        sceletonCupConteiner.addSubview(sceletonArrowsImageView)
//
//        sceletonArrowsImageView.snp.makeConstraints {
//            $0.right.equalToSuperview().inset(24.scaleIfNeeded())
//            $0.centerY.equalToSuperview()
//            $0.size.equalTo(32.scale())
//        }
//    }
    
    private func setupSceletonBalanceView() {
        sceletonBalanceView.isSkeletonable = true
        sceletonBalanceView.backgroundColor = Color.profileViewBackground()
        sceletonBalanceView.layer.cornerRadius = 8
        sceletonContainer.addSubview(sceletonBalanceView)
        
        sceletonBalanceView.snp.makeConstraints {
            $0.top.equalTo(sceletonNickname.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.bottom.equalToSuperview()
        }
    }
    
    private func setupSceletonBalanceContainer() {
        sceletonBalanceContainer.isSkeletonable = true
        sceletonBalanceView.addSubview(sceletonBalanceContainer)
        
        sceletonBalanceContainer.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }
    
    private func setupSceletonBalanceLabel() {
        sceletonBalanceLabel.isSkeletonable = true
        sceletonBalanceLabel.skeletonCornerRadius = 4
        sceletonBalanceContainer.addSubview(sceletonBalanceLabel)
        
        sceletonBalanceLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(33.scale())
            $0.left.equalToSuperview().inset(24.scaleIfNeeded())
            $0.right.equalToSuperview().inset(235.scaleIfNeeded())
            $0.height.equalTo(8.scale())
        }
    }
    
    private func setupSceletonBalanceCount() {
        sceletonBalanceCount.isSkeletonable = true
        sceletonBalanceCount.skeletonCornerRadius = 4
        sceletonBalanceContainer.addSubview(sceletonBalanceCount)
        
        sceletonBalanceCount.snp.makeConstraints {
            $0.top.equalTo(sceletonBalanceLabel.snp.bottom).offset(26.scale())
            $0.left.equalToSuperview().inset(24.scaleIfNeeded())
            $0.right.equalToSuperview().inset(253.scaleIfNeeded())
            $0.height.equalTo(10.scale())
        }
    }
    
//    private func setupSceletonBonusRubsLabel() {
//        sceletonBonusRubsLabel.isSkeletonable = true
//        sceletonBonusRubsLabel.skeletonCornerRadius = 4
//        sceletonBalanceContainer.addSubview(sceletonBonusRubsLabel)
//
//        sceletonBonusRubsLabel.snp.makeConstraints {
//            $0.top.equalTo(sceletonBalanceCount.snp.bottom).offset(37.scale())
//            $0.left.equalToSuperview().inset(24.scaleIfNeeded())
//            $0.right.equalToSuperview().inset(235.scaleIfNeeded())
//            $0.height.equalTo(8.scale())
//        }
//    }
//
//    private func setupSceletonIconBonusBalance() {
//        sceletonIconBonusBalance.isSkeletonable = true
//        sceletonIconBonusBalance.skeletonCornerRadius = 12
//        sceletonBalanceContainer.addSubview(sceletonIconBonusBalance)
//
//        sceletonIconBonusBalance.snp.makeConstraints {
//            $0.top.equalTo(sceletonBonusRubsLabel.snp.bottom).offset(14.scale())
//            $0.left.equalToSuperview().inset(24.scaleIfNeeded())
//            $0.size.equalTo(24.scale())
//        }
//    }
//
//    private func setupSceletonBonusRubsInfo() {
//        sceletonBonusRubsInfo.isSkeletonable = true
//        sceletonBonusRubsInfo.skeletonCornerRadius = 4
//        sceletonBalanceContainer.addSubview(sceletonBonusRubsInfo)
//
//        sceletonBonusRubsInfo.snp.makeConstraints {
//            $0.top.equalTo(sceletonBonusRubsLabel.snp.bottom).offset(21.scale())
//            $0.left.equalTo(sceletonIconBonusBalance.snp.right).offset(8.scaleIfNeeded())
//            $0.right.equalToSuperview().inset(221.scaleIfNeeded())
//            $0.height.equalTo(10.scale())
//        }
//    }
    
    private func sceletonSceletonDepositButton() {
        sceletonDepositButton.isSkeletonable = true
        sceletonDepositButton.backgroundColor = Color.sceletonColor()
        sceletonDepositButton.layer.cornerRadius = 8
        sceletonDepositButton.layer.maskedCorners = [.layerMaxXMaxYCorner, .layerMinXMaxYCorner]
        sceletonBalanceContainer.addSubview(sceletonDepositButton)
        
        sceletonDepositButton.snp.makeConstraints {
            $0.bottom.left.right.equalToSuperview()
            $0.height.equalTo(58.scale())
        }
    }
    
    private func setupSceletonButtonTitle() {
        sceletonButtonTitle.isSkeletonable = true
        sceletonButtonTitle.skeletonCornerRadius = 4
        sceletonDepositButton.addSubview(sceletonButtonTitle)
        
        sceletonButtonTitle.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(130.scaleIfNeeded())
            $0.centerY.equalToSuperview()
            $0.height.equalTo(6.scale())
        }
    }
}

extension ProfileSceletonView {
    func sceletonShow() {
        sceletonContainer.isHidden = false
        
//        sceletonCupTitleLabel.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonCupImageView.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonCupCountLabel.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//
//        sceletonLeaderboardLabelTop.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonLeaderboardLabelBot.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonArrowsImageView.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)

        sceletonWelcome.showAnimatedGradientSkeleton(
            usingGradient: SkeletonGradient(baseColor:Color.profileViewBackground()!))
        sceletonNickname.showAnimatedGradientSkeleton(
            usingGradient: SkeletonGradient(baseColor:Color.profileViewBackground()!))

        sceletonBalanceView.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
        sceletonBalanceContainer.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
        sceletonBalanceLabel.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
        sceletonBalanceCount.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonBonusRubsLabel.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonIconBonusBalance.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)
//        sceletonBonusRubsInfo.showAnimatedGradientSkeleton(usingGradient: sceletonGradient)

        sceletonButtonTitle.showAnimatedGradientSkeleton(
            usingGradient: SkeletonGradient(baseColor: Color.sceletonButtonTitle()!))
    }
    
    func sceletonHide() {
        sceletonContainer.isHidden = true
        
        sceletonButtonTitle.hideSkeleton()
//        sceletonCupTitleLabel.hideSkeleton()
//        sceletonCupImageView.hideSkeleton()
//        sceletonCupCountLabel.hideSkeleton()
//
//        sceletonLeaderboardLabelTop.hideSkeleton()
//        sceletonLeaderboardLabelBot.hideSkeleton()
//        sceletonArrowsImageView.hideSkeleton()
        
        sceletonWelcome.hideSkeleton()
        sceletonNickname.hideSkeleton()
        
        sceletonBalanceView.hideSkeleton()
        sceletonBalanceContainer.hideSkeleton()
        sceletonBalanceLabel.hideSkeleton()
        sceletonBalanceCount.hideSkeleton()
//        sceletonBonusRubsLabel.hideSkeleton()
//        sceletonIconBonusBalance.hideSkeleton()
//        sceletonBonusRubsInfo.hideSkeleton()
        
        sceletonButtonTitle.hideSkeleton()
    }
}
