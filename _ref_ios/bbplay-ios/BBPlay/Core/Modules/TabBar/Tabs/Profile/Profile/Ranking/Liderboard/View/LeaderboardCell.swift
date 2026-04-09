import Foundation
import SnapKit

final class LeaderboardCell: BaseCollectionCell {
    
    private let placeView = UIView()
    private let placeLabel = UILabel()
    private let nicknameView = UIView()
    private let nicknameLable = UILabel()
    private let scoreView = UIView()
    private let scoreLabel = UILabel()
    
    override func setupUI() {
        backgroundColor = Color.background()
        setupPlaceView()
        setupPlaceLabel()
        setupNicknameView()
        setupNicknameLable()
        setupScoreView()
        setupScoreLabel()
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        placeLabel.textColor = .white
        nicknameLable.textColor = .white
        scoreLabel.textColor = .white
    }

    private func setupPlaceView()  {
        placeView.backgroundColor = Color.firstPlace()
        placeView.layer.cornerRadius = 4
        contentView.addSubview(placeView)
        
        placeView.snp.makeConstraints {
            $0.left.top.bottom.equalToSuperview()
            $0.width.equalTo(38.scaleIfNeeded())
        }
    }

    private func setupPlaceLabel() {
        placeLabel.textAlignment = .center
        placeLabel.font = Font.dinRoundProBold(size: 16.scale())
        placeLabel.textColor = .white
        placeView.addSubview(placeLabel)
        
        placeLabel.snp.makeConstraints {
            $0.centerY.equalToSuperview()
            $0.left.right.equalToSuperview()
        }
    }

    private func setupNicknameView() {
        nicknameView.backgroundColor = Color.firstPlace()
        nicknameView.layer.cornerRadius = 4
        contentView.addSubview(nicknameView)
        
        nicknameView.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.left.equalTo(placeView.snp.right).offset(4.scaleIfNeeded())
            $0.width.equalTo(164.scaleIfNeeded())
        }
    }

    private func setupNicknameLable() {
        nicknameLable.textAlignment = .center
        nicknameLable.font = Font.dinRoundProBold(size: 16.scale())
        nicknameLable.textColor = .white
        nicknameView.addSubview(nicknameLable)
        
        nicknameLable.snp.makeConstraints {
            $0.centerY.equalToSuperview()
            $0.left.right.equalToSuperview()
        }
    }

    private func setupScoreView() {
        scoreView.backgroundColor = Color.firstPlace()
        scoreView.layer.cornerRadius = 4
        contentView.addSubview(scoreView)
        
        scoreView.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.left.equalTo(nicknameView.snp.right).offset(4.scaleIfNeeded())
            $0.right.equalToSuperview()
            $0.width.equalTo(117.scaleIfNeeded())
        }
    }

    private func setupScoreLabel() {
        scoreLabel.textAlignment = .center
        scoreLabel.font = Font.dinRoundProBold(size: 16.scale())
        scoreLabel.textColor = .white
        scoreView.addSubview(scoreLabel)
        
        scoreLabel.snp.makeConstraints {
            $0.centerY.equalToSuperview()
            $0.left.right.equalToSuperview()
        }
    }
    
    func update(with info: Rank, index: Int, and sortType: SortType?) {
        placeView.backgroundColor = Color.secondPlace()
        placeLabel.text = String(index)
        nicknameLable.text = info.playerName
        
        switch index {
            case 1:
                placeView.backgroundColor = Color.firstPlace()
                nicknameView.backgroundColor = Color.firstPlace()
                scoreView.backgroundColor = Color.firstPlace()
            case 2:
                placeView.backgroundColor = Color.secondPlace()
                nicknameView.backgroundColor = Color.secondPlace()
                scoreView.backgroundColor = Color.secondPlace()
            case 3:
                placeView.backgroundColor = Color.thirdPlace()
                nicknameView.backgroundColor = Color.thirdPlace()
                scoreView.backgroundColor = Color.thirdPlace()
            default:
                placeView.backgroundColor = Color.notPrizePlace()
                nicknameView.backgroundColor = Color.notPrizePlace()
                scoreView.backgroundColor = Color.notPrizePlace()
        }
     
        switch sortType {
            case .assistants:
                scoreLabel.text = info.gameType == .csgo ? String(info.assistsCSGO) : String(info.assist)
            case .defeats:
                scoreLabel.text = String(info.losses)
            case .victories:
                scoreLabel.text = String(info.wins)
            case .KDR:
                scoreLabel.text = String(format: "%.1f", info.kdr)
            case .kills:
                scoreLabel.text = String(info.kills)
            case .deaths:
                scoreLabel.text = String(info.deaths)
            case .points:
                scoreLabel.text = String(info.points)
            case .winRatio:
                scoreLabel.text = String(format: "%.2f", info.winRatio)
            case nil, .some(.none):
                assertionFailure()
        }
    }
}

// TODO: - Cделать новую ячейку, это оставить, но вызывать как супер
extension LeaderboardCell {
    func update(with nick: String,
                rank: Int,
                rankCurrentPlayer: Int?,
                and score: String) {
        placeLabel.text = String(rank)
        nicknameLable.text = nick
        nicknameLable.textAlignment = .left
        scoreLabel.text = score
        
        updateConstraint()

        switch rank {
            case 1:
                placeView.backgroundColor = Color.firstPlace()
                nicknameView.backgroundColor = Color.firstPlace()
                scoreView.backgroundColor = Color.firstPlace()
            case 2:
                placeView.backgroundColor = Color.secondPlace()
                nicknameView.backgroundColor = Color.secondPlace()
                scoreView.backgroundColor = Color.secondPlace()
            case 3:
                placeView.backgroundColor = Color.thirdPlace()
                nicknameView.backgroundColor = Color.thirdPlace()
                scoreView.backgroundColor = Color.thirdPlace()
            default:
                placeView.backgroundColor = Color.notPrizePlace()
                nicknameView.backgroundColor = Color.notPrizePlace()
                scoreView.backgroundColor = Color.notPrizePlace()
        }
        
        if rank == rankCurrentPlayer {
            let backgroundColor = Color.currentPlayerColor()
            placeView.backgroundColor = backgroundColor
            nicknameView.backgroundColor = backgroundColor
            scoreView.backgroundColor = backgroundColor
            
            let textColor = Color.currentPlayerTextColor()
            placeLabel.textColor = textColor
            nicknameLable.textColor = textColor
            scoreLabel.textColor = textColor
        }
    }
    
    func updateConstraint() {
        nicknameLable.snp.remakeConstraints {
            $0.centerY.equalToSuperview()
            $0.left.right.equalToSuperview().inset(12.scaleIfNeeded())
        }
    }
}
