package mobi.blackbears.bbplay.screens.clubs.presentation

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.R
import mobi.blackbears.bbplay.common.fragment.BindingFragment
import mobi.blackbears.bbplay.databinding.FragmentJobReviewDialogBinding

class JobReviewDialogFragment :
    BindingFragment<FragmentJobReviewDialogBinding>(FragmentJobReviewDialogBinding::inflate) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sendReview()
        navigateBack()
    }

    private fun navigateBack() {
        binding.btBackToClubs.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun sendReview() {
        binding.btSendRewiev.setOnClickListener {
            val email = getString(R.string.email)
            val subject = getString(R.string.subject)
            val body = binding.etJobReview.text.toString()
            val mailto = "mailto:$email" +
                    "?cc=" + email +
                    "&subject=" + Uri.encode(subject) +
                    "&body=" + Uri.encode(body)

            val emailIntent = Intent(Intent.ACTION_SENDTO)
            emailIntent.data = Uri.parse(mailto)
            try {
                startActivity(emailIntent)
            } catch (error: Throwable) {
                showToast(R.string.error_email)
            }

            findNavController().navigateUp()
        }
    }

    private fun showToast(message: Int) {
        Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
    }
}