'use client'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { User, Mail, Phone, MapPin, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

type UserSettings = {
  name: string
  email: string
  phone: string
  address: string
  notifications: boolean
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser()

  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notifications: true,
  })

  useEffect(() => {
    if (isLoaded && user) {
      setSettings(prev => ({
        ...prev,
        name: user.fullName || '',
        email: user.emailAddresses[0]?.emailAddress || '',
        phone: user.phoneNumbers[0]?.phoneNumber || '',
      }))
    }
  }, [isLoaded, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Updated settings:', settings)
    alert('Settings updated successfully!')
  }

  if (!isLoaded) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">Account Settings</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <div className="relative">
            <input
              type="text"
              id="name"
              name="name"
              value={settings.name}
              onChange={handleInputChange}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {/* email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <div className="relative">
            <input
              type="email"
              id="email"
              name="email"
              value={settings.email}
              onChange={handleInputChange}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>



        {/* notifications */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="notifications"
            name="notifications"
            checked={settings.notifications}
            onChange={handleInputChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
          />
          <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
            Receive email notifications
          </label>
        </div>

        {/* Save Button */}
        <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </form>
    </div>
  )
}
