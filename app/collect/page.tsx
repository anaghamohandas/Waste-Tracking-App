'use client'
import { useState, useEffect } from 'react'
import { Trash2, MapPin, CheckCircle, Clock, ArrowRight, Camera, Upload, Loader, Calendar, Weight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { useUser } from "@clerk/nextjs"
import { getWasteCollectionTasks, updateTaskStatus, saveReward, saveCollectedWaste, getUserByEmail } from '@/utils/db/actions'
import { GoogleGenerativeAI } from "@google/generative-ai"



// Make sure to set your Gemini API key in your environment variables
const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY

type CollectionTask = {
  id: number
  location: string
  wasteType: string
  amount: string
  status: 'pending' | 'in_progress' | 'completed' | 'verified'
  date: string
  collectorId: number | null
}

const ITEMS_PER_PAGE = 5

export default function CollectPage() {
  const [tasks, setTasks] = useState<CollectionTask[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredWasteType, setHoveredWasteType] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { user, isLoaded } = useUser()
  const [dbUser, setDbUser] = useState<any>(null)

useEffect(() => {
  const fetchUserAndTasks = async () => {
    if (isLoaded && user) {
      try {
        const dbUserRes = await getUserByEmail(user.emailAddresses[0].emailAddress)
        if (!dbUserRes) {
          toast.error("User not found in database")
          return
        }
        setDbUser(dbUserRes)

        const fetchedTasks = await getWasteCollectionTasks()

// Sort tasks by date (latest first)
const sortedTasks = (fetchedTasks as CollectionTask[]).sort((a, b) => {
  return new Date(b.date).getTime() - new Date(a.date).getTime()
})

setTasks(sortedTasks)
      } catch (err) {
        console.error(err)
        toast.error("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
  }

  fetchUserAndTasks()
}, [isLoaded, user])


  const [selectedTask, setSelectedTask] = useState<CollectionTask | null>(null)
  const [verificationImage, setVerificationImage] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteTypeMatch: boolean;
    quantityMatch: boolean;
    confidence: number;
  } | null>(null)
  const [reward, setReward] = useState<number | null>(null)

const handleStatusChange = async (taskId: number, newStatus: CollectionTask['status']) => {
  if (!user) {
    toast.error('Please log in to collect waste.')
    return
  }

  try {
    const dbUser = await getUserByEmail(user.emailAddresses[0].emailAddress)
    if (!dbUser) {
      toast.error('User not found in database.')
      return
    }

    const updatedTask = await updateTaskStatus(taskId, newStatus, dbUser.id)
    if (updatedTask) {
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus, collectorId: dbUser.id } : task
      ))
      toast.success('Task status updated successfully')
    } else {
      toast.error('Failed to update task status. Please try again.')
    }
  } catch (error) {
    console.error('Error updating task status:', error)
    toast.error('Failed to update task status. Please try again.')
  }
}


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setVerificationImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const readFileAsBase64 = (dataUrl: string): string => {
    return dataUrl.split(',')[1]
  }

  const handleVerify = async () => {
    if (!selectedTask || !verificationImage || !user) {
      toast.error('Missing required information for verification.')
      return
    }

    setVerificationStatus('verifying')
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      const base64Data = readFileAsBase64(verificationImage)

      const imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg', 
          },
        },
      ]

      const prompt = `You are an AI expert in cleanliness and environment inspection. Analyze the uploaded image and provide:
      1. Confirm if there is any visible waste in the imageignore small lumps just check whether the earlier big waste is cleaned and is there any waste.
      2. Confirm if the location in the image is visually similar to the earlier submitted report but the waste should be cleared in that way.
      3. Your confidence level in this overall assessment (as a number between 0 and 1).
      
      Respond strictly in the following JSON format:
      {
        "noWastePresent": true/false,
        "locationMatch": true/false,
        "confidence": confidence level as a number between 0 and 1
      }`

      const result = await model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = response.text()
      
      try {
        const jsonString = text.match(/{[\s\S]*}/)?.[0]
      const parsedResult = jsonString ? JSON.parse(jsonString) : null
      setVerificationResult({
        wasteTypeMatch: !parsedResult.noWastePresent,
        quantityMatch: parsedResult.locationMatch,
        confidence: parsedResult.confidence
      })
        setVerificationStatus('success')
        
        if (parsedResult.noWastePresent && parsedResult.locationMatch && parsedResult.confidence > 0.7) {
          await handleStatusChange(selectedTask.id, 'verified')
          const earnedReward = 30
        
          await saveReward(dbUser.id, earnedReward)
          await saveCollectedWaste(selectedTask.id, dbUser.id, parsedResult)
        
          setReward(earnedReward)
          toast.success(`Verification successful! You earned ${earnedReward} tokens!`, {
            duration: 5000,
            position: 'top-center',
          })
        } else {
          toast.error('Verification failed. The area still seems to have waste or location doesn’t match.', {
            duration: 5000,
            position: 'top-center',
          })
        }
      } catch (error) {
        console.log(error);
        
        console.error('Failed to parse JSON response:', text)
        setVerificationStatus('failure')
      }
    } catch (error) {
      console.error('Error verifying waste:', error)
      setVerificationStatus('failure')
    }
  }

  const filteredTasks = tasks
  .filter(task =>
    task.location.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .sort((a, b) => {
    // Move verified tasks to the end
    if (a.status === 'verified' && b.status !== 'verified') return 1
    if (a.status !== 'verified' && b.status === 'verified') return -1

    // Otherwise sort by oldest date first
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })


  const pageCount = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">Waste Collection Tasks</h1>
      
      <div className="mb-4 flex items-center">
        <Input
          type="text"
          placeholder="Search by area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mr-2"
        />
        <Button variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin h-8 w-8 text-gray-500" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedTasks.map(task => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium text-gray-800 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                    {task.location}
                  </h2>
                  <StatusBadge status={task.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center relative">
                    <Trash2 className="w-4 h-4 mr-2 text-gray-500" />
                    <span 
                      onMouseEnter={() => setHoveredWasteType(task.wasteType)}
                      onMouseLeave={() => setHoveredWasteType(null)}
                      className="cursor-pointer"
                    >
                      {task.wasteType.length > 8 ? `${task.wasteType.slice(0, 8)}...` : task.wasteType}
                    </span>
                    {hoveredWasteType === task.wasteType && (
                      <div className="absolute left-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                        {task.wasteType}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Weight className="w-4 h-4 mr-2 text-gray-500" />
                    {task.amount}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    {task.date}
                  </div>
                </div>
                <div className="flex justify-end">
                  {task.status === 'pending' && (
                    <Button onClick={() => handleStatusChange(task.id, 'in_progress')} variant="outline" size="sm">
                      Start Collection
                    </Button>
                  )}
{task.status === 'in_progress' && (
  task.collectorId === dbUser?.id ? (

    <Button onClick={() => setSelectedTask(task)} variant="default" size="sm">
      Complete & Verify
    </Button>
  ) : task.collectorId ? (
    <span className="text-yellow-600 text-sm font-medium">In progress by another collector</span>
  ) : (
    <Button onClick={() => handleStatusChange(task.id, 'in_progress')} variant="outline" size="sm">
      Start Collection
    </Button>
  )
)}
                  {task.status === 'verified' && (
                    <span className="text-green-600 text-sm font-medium">Reward Earned</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="mr-2"
            >
              Previous
            </Button>
            <span className="mx-2 self-center">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
              disabled={currentPage === pageCount}
              className="ml-2"
            >
              Next
            </Button>
          </div>
        </>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Verify Collection</h3>
            <p className="mb-4 text-sm text-gray-600">Upload a photo of the collected waste to verify and earn your reward.</p>
            <div className="mb-4">
              <label htmlFor="verification-image" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="verification-image"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload a file</span>
                      <input id="verification-image" name="verification-image" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>
            {verificationImage && (
              <img src={verificationImage} alt="Verification" className="mb-4 rounded-md w-full" />
            )}
            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={!verificationImage || verificationStatus === 'verifying'}
            >
              {verificationStatus === 'verifying' ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Verifying...
                </>
              ) : 'Verify Collection'}
            </Button>
            {verificationStatus === 'success' && verificationResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
<p>Is the Waste Cleaned: {!verificationResult.wasteTypeMatch ? "Yes" : "No"}</p>
<p>Does the Place Match: {verificationResult.quantityMatch ? "Yes" : "No"}</p>
<p>Confidence: {(verificationResult.confidence * 100).toFixed(2)}%</p>


              </div>
            )}
            {verificationStatus === 'failure' && (
              <p className="mt-2 text-red-600 text-center text-sm">Verification failed. Please try again.</p>
            )}
            <Button onClick={() => setSelectedTask(null)} variant="outline" className="w-full mt-2">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Add a conditional render to show user info or login prompt */}
      {/* {user ? (
        <p className="text-sm text-gray-600 mb-4">Logged in as: {user.name}</p>
      ) : (
        <p className="text-sm text-red-600 mb-4">Please log in to collect waste and earn rewards.</p>
      )} */}
    </div>
  )
}

function StatusBadge({ status }: { status: CollectionTask['status'] }) {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    in_progress: { color: 'bg-blue-100 text-blue-800', icon: Trash2 },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    verified: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  }

  const { color, icon: Icon } = statusConfig[status]

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color} flex items-center`}>
      <Icon className="mr-1 h-3 w-3" />
      {status.replace('_', ' ')}
    </span>
  )
}