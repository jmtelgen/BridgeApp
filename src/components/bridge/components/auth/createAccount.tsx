import type React from "react"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { userAuthService, type CreateAccountRequest } from "../../../../services/userAuthService"

// Types are now imported from userAuthService

export default function CreateAccountPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSuccess, setIsSuccess] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    if (!formData.email.includes("@")) {
      newErrors.email = "Please enter a valid email address"
    }

    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const accountData: CreateAccountRequest = {
        username: formData.username,
        email: formData.email,
        password: formData.password
      }

      // Make API call to create account endpoint
      const response = await userAuthService.createAccount(accountData)

      console.log('Account created successfully:', response.user.username)
      
      // Show success message
      setIsSuccess(true)
      
      // Redirect to login page after a short delay to show success message
      setTimeout(() => {
        navigate("/login")
      }, 1500)
      
    } catch (error) {
      console.error('Account creation error:', error)
      setErrors({ general: error instanceof Error ? error.message : 'Account creation failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600">
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-400 via-blue-500 to-purple-600 opacity-70 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-400 to-pink-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="absolute inset-0 backdrop-blur-sm bg-white/10 dark:bg-black/20"></div>

      <div className="relative z-10 flex items-center justify-center p-4 min-h-screen">
        <Card className="w-full max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                Join the Game
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-2 font-medium">
                Create your account and start playing
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleCreateAccount} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Username
                </Label>
                                  <Input
                    id="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => handleInputChange("username", e.target.value)}
                    required
                    disabled={isSuccess}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-yellow-400 focus:ring-yellow-400/30 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:opacity-50"
                  />
                {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Email Address
                </Label>
                                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                    disabled={isSuccess}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-yellow-400 focus:ring-yellow-400/30 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 disabled:opacity-50"
                  />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    disabled={isSuccess}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-yellow-400 focus:ring-yellow-400/30 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 pr-12 disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSuccess}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                    disabled={isSuccess}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:border-yellow-400 focus:ring-yellow-400/30 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 pr-12 disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSuccess}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
              </div>

              {/* Success message display */}
              {isSuccess && (
                <p className="text-green-600 text-sm text-center font-medium">
                  Account created successfully! Redirecting to login...
                </p>
              )}

              {/* General error display */}
              {errors.general && (
                <p className="text-red-500 text-sm text-center">{errors.general}</p>
              )}

                              <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-yellow-500 via-pink-600 to-purple-600 hover:from-yellow-400 hover:via-pink-500 hover:to-purple-500 text-white font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
                  disabled={isLoading || isSuccess}
                >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : isSuccess ? (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Account Created!
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </div>
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-yellow-500 hover:text-pink-500 transition-colors duration-200"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
