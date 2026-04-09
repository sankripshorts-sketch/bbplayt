package mobi.blackbears.bbplay.common.activity

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.navigation.fragment.NavHostFragment
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updatePadding
import androidx.lifecycle.*
import androidx.navigation.NavController
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.ktx.analytics
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.activity.di.DaggerActivityComponent
import mobi.blackbears.bbplay.common.activity.navigation.BottomNavigationUI
import mobi.blackbears.bbplay.common.application.appComponent
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.viewmodelfactory.ViewModelFactory
import mobi.blackbears.bbplay.databinding.ActivityMainBinding
import javax.inject.Inject

class MainActivity : AppCompatActivity() {
    private var _binding: ActivityMainBinding? = null
    private val binding get() = _binding!!
    private lateinit var firebaseAnalytics: FirebaseAnalytics

    private val navController: NavController by lazy {
        (supportFragmentManager.findFragmentById(R.id.nav_host_fragment) as NavHostFragment).navController
    }

    @Inject
    lateinit var factory: ViewModelFactory
    private val viewModel by viewModels<MainViewModel> { factory }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DaggerActivityComponent.factory().create(appComponent).inject(this)
        launchSplashScreen()
        firebaseAnalytics = Firebase.analytics
        _binding = ActivityMainBinding.inflate(layoutInflater)
        enableEdgeToEdge()
        setContentView(binding.root)
        observeLogoutMessage()

        applyViewInsets(binding.root)
        ViewCompat.setOnApplyWindowInsetsListener(binding.bottomNavigation) { view, insets -> insets }
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = false

        viewModel.navCommand.observe(this@MainActivity) { (resId, args, options) ->
            navController.navigate(resId, args, options)
            if (resId == R.id.profile_item || resId == R.id.loginFragment) {
                navController.graph.setStartDestination(resId)
            }
        }

        viewModel.errorFlow.observe(this@MainActivity) {
            Toast.makeText(this, it.responseMessage, Toast.LENGTH_SHORT).show()
        }

        BottomNavigationUI.setBottomNavigation(
            binding.bottomNavigation,
            navController,
            viewModel::navigateToItem
        )
    }

    private fun launchSplashScreen() {
        val splashScreen = installSplashScreen()

        lifecycleScope.launch {
            val isVisibleFlow = MutableStateFlow(true)

            launch {
                delay(500)
                viewModel.checkUserId
                    .onEach { clickedOnProfile() }
                    //Нужна задержка, чтобы фрагмент логина успел подмениться профилем или наоборот
                    .debounce(650)
                    .observe(this@MainActivity, Lifecycle.State.CREATED) {
                        isVisibleFlow.tryEmit(false)
                    }
            }

            splashScreen.setKeepOnScreenCondition {
                return@setKeepOnScreenCondition isVisibleFlow.value
            }
        }
    }

    private fun applyViewInsets(view: View) {
        ViewCompat.setOnApplyWindowInsetsListener(view) { view, insets ->
            val statusBars = insets.getInsets(WindowInsetsCompat.Type.statusBars())
            val navBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())

            view.updatePadding(
                left = statusBars.left + navBars.left,
                top = statusBars.top,
                right = statusBars.right + navBars.right,
                bottom = maxOf(navBars.bottom, ime.bottom)
            )
            insets
        }
    }

    private fun clickedOnProfile() {
        binding.bottomNavigation.menu.performIdentifierAction(R.id.profile_item, 0)
    }

    private fun observeLogoutMessage() {
        viewModel.logoutToastMessage.observe(this@MainActivity) {
            Toast.makeText(this, getString(it), Toast.LENGTH_LONG).show()
        }
    }
}