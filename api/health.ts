export default function handler(_req:any,res:any){res.setHeader('Cache-Control','no-store');return res.status(200).json({status:'ok',hasGeminiKey:Boolean(process.env.GEMINI_API_KEY?.trim())})}
