import Foundation
import UIKit

final class ProfileContainerViewController: UIViewController {

    private var profileViewController: ProfileViewController?
    private var loginViewController: LoginViewController?
    private let authManager: AuthManager
    private let componentFactory: ProfileScreenComponentFactory

    init(authManager: AuthManager,
         componentFactory: ProfileScreenComponentFactory) {
        self.authManager = authManager
        self.componentFactory = componentFactory
        super.init(nibName: nil, bundle: nil)
        authManager.add(listener: self)
        
        authManager.isLoggedIn ? openProfileViewController() : openLoginViewController()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }

    deinit {
        authManager.remove(listener: self)
    }

    private func openLoginViewController() {
        if let profileViewController = profileViewController,
           profileViewController.isViewLoaded {
            profileViewController.willMove(toParent: nil)
            profileViewController.view.removeFromSuperview()
            profileViewController.removeFromParent()
            self.profileViewController = nil
            navigationItem.rightBarButtonItem = nil
            navigationController?.navigationBar.isHidden = true
        }

        loginViewController = componentFactory.makeLoginViewController()
        guard let loginViewController = loginViewController else {
            logger.error("\(self) controller is nil")
            assertionFailure()
            return
        }

        addChild(loginViewController)
        loginViewController.view.frame = view.frame
        view.addSubview(loginViewController.view)
        loginViewController.didMove(toParent: self)
    }

    private func openProfileViewController() {
        if let loginViewController = loginViewController,
            loginViewController.isViewLoaded {
            loginViewController.willMove(toParent: nil)
            loginViewController.view.removeFromSuperview()
            loginViewController.removeFromParent()
            self.loginViewController = nil
        }

        profileViewController = componentFactory.makeProfileViewController()
        guard let profileViewController = profileViewController else {
            logger.error("\(self) controller is nil")
            assertionFailure()
            return
        }

        addChild(profileViewController)
        profileViewController.view.frame = view.frame
        view.addSubview(profileViewController.view)
        profileViewController.didMove(toParent: self)
    }
}

// MARK: - AuthManagerListener -
extension ProfileContainerViewController: AuthManagerListener {
    func login() {
        DispatchQueue.main.async { [self] in
            navigationController?.navigationBar.isHidden = true
            openProfileViewController()
        }
    }

    func logout() {
        openLoginViewController()
    }
}
