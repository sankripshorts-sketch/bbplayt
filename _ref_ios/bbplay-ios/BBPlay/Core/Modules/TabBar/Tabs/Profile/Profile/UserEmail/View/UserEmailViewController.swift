import Foundation
import UIKit
import Combine

final class UserEmailViewController: UIViewController {
    
    private let mainView = UserEmailContentView()
    private let presenter: UserEmailPresenter
    private let notificationCenter = NotificationCenter.default
    private var cancellables: Set<AnyCancellable> = []
    
    init(
        presenter: UserEmailPresenter
    ) {
        self.presenter = presenter
        super.init(nibName: nil, bundle: nil)
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    override func loadView() {
        view = mainView
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        presenter.viewDidLoad()
        setupActions()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        setupNotifications()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        removeNotification()
    }

    private func setupActions() {
        mainView.setTextFieldValidateAction { [weak self] email in
            self?.presenter.validateEmail(email)
        }
        
        mainView.setButtonAction { [weak self] email in
            self?.presenter.didTapNext(email: email)
        }
    }

    private func setupNotifications() {
        notificationCenter
            .publisher(for: UIResponder.keyboardWillShowNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                guard let self else { return }
                let key = UIResponder.keyboardFrameEndUserInfoKey
                let frame = notification.userInfo?[key] as? CGRect
                
                guard let height = frame?.height else { return }

                self.mainView.setContentOffset(
                    contentOffsetY: height - UIView.safeAreaBottom,
                    animated: true
                )
            }
            .store(in: &cancellables)

        notificationCenter
            .publisher(for: UIResponder.keyboardWillHideNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self else { return }
                self.mainView.setContentOffset(
                    contentOffsetY: 0,
                    animated: false
                )
            }
            .store(in: &cancellables)
    }

    func removeNotification() {
        cancellables = []
    }

}

extension UserEmailViewController: UserEmailView {
    
    func hideKeyboard(completion: @escaping EmptyClosure) {
        mainView.hideKeyboard(completion: completion)
    }

    func updateButton(isEnabled: Bool) {
        mainView.updateButton(isEnabled: isEnabled)
    }

    func close() {
        guard let navigationController else { return }

        let viewControllers = navigationController.viewControllers.filter { !($0 is Self) }
        navigationController.setViewControllers(viewControllers, animated: false)
    }

}
