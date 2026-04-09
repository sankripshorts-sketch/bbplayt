package mobi.blackbears.bbplay.screens.login.fragments.registration.model

data class ButtonVisibility(
    var isNicknameFilled: Boolean = false,
    var isPhoneFilled: Boolean = false,
    var isFirstNameFilled: Boolean = false,
    var isSecondNameFilled: Boolean = false,
    var isDateOfBirthFilled: Boolean = false,
    var isPasswordFilled: Boolean = false,
    var isEmailFilled: Boolean = false,
    var isAgreeWithTermsOfUseChecked: Boolean = true,
)

