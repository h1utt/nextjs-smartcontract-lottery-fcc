import { useWeb3Contract } from "react-moralis"
import { abi, contractAddresses } from "../constants"
import { useMoralis } from "react-moralis"
import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { useNotification } from "web3uikit"
import { CountdownCircleTimer } from "react-countdown-circle-timer"

export default function LotteryEntrance() {
    const { chainId: chainIdHex, isWeb3Enabled, web3 } = useMoralis()
    const chainId = parseInt(chainIdHex)
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null
    const [entranceFee, setEntranceFee] = useState("0")
    const [numberOfPlayers, setNumberOfPlayers] = useState("0")
    const [timeLeft, setTimeLeft] = useState("0")
    const [recentWinner, setRecentWinner] = useState("0")

    const dispatch = useNotification()

    const {
        runContractFunction: enterRaffle,
        isLoading,
        isFetching,
    } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "enterRaffle",
        param: {},
        msgValue: entranceFee,
    })

    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getEntranceFee",
        param: {},
    })

    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getNumberOfPlayers",
        param: {},
    })

    const { runContractFunction: getInterval } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getInterval",
        param: {},
    })

    const { runContractFunction: getRecentWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress, // specify the networkId
        functionName: "getRecentWinner",
        param: {},
    })

    async function updateUI() {
        const entranceFeeFromCall = (await getEntranceFee()).toString()
        const numPlayersFromcall = (await getNumberOfPlayers()).toString()
        const recentWinnerFromCall = await getRecentWinner()
        const timeLeftFromCall = await getInterval()
        setEntranceFee(entranceFeeFromCall)
        setNumberOfPlayers(numPlayersFromcall)
        setTimeLeft(timeLeftFromCall)
        setRecentWinner(recentWinnerFromCall)
    }

    async function listenForWinnerToBePicked() {
        const raffle = new ethers.Contract(raffleAddress, abi, web3)
        console.log("Waiting for a winner ...")
        await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
                console.log("We got a winner!")
                try {
                    await updateUI()
                    resolve()
                } catch (error) {
                    console.log(error)
                    reject(error)
                }
            })
        })
    }

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI()
            listenForWinnerToBePicked()
        }
    }, [isWeb3Enabled])

    const handleSuccess = async function (tx) {
        await tx.wait(1)
        handleNewNotification(tx)
        updateUI()
    }

    const handleNewNotification = function () {
        dispatch({
            type: "info",
            message: "Transaction Complete!",
            title: "Tx Notification",
            position: "topR",
            icon: "bell",
        })
    }
    const renderTime = ({ remainingTime }) => {
        if (remainingTime === 0) {
            return <div className="flex flex-col items-center">TIME'S UP!</div>
        }

        return (
            <div className="flex flex-col items-center">
                <div className="text-gray-500">Remaining</div>
                <div className="text-4xl">{remainingTime}</div>
                <div className="text-gray-500">seconds</div>
            </div>
        )
    }

    return (
        <div className="p-5">
            {raffleAddress ? (
                <div>
                    <div className="p-3 border-t-2 flex flex-row"></div>
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-auto"
                        onClick={async function () {
                            await enterRaffle({
                                onSuccess: handleSuccess,
                                onError: (error) => console.log(error),
                            })
                        }}
                        disabled={isLoading || isFetching}
                    >
                        {isLoading || isFetching ? (
                            <div className="animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
                        ) : (
                            <div>Enter Raffle</div>
                        )}
                    </button>
                    <div>Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH</div>
                    <div>The current number of players is: {numberOfPlayers}</div>
                    <div className="p-3 border-b-2 flex flex-row"></div>
                    <div className="p-4">Time left:</div>
                    <div className="flex justify-center py-2.5 my-2">
                        <CountdownCircleTimer
                            isPlaying
                            duration={Number(timeLeft)}
                            colors={["#004777", "#F7B801", "#A30000", "#A30000"]}
                            colorsTime={[timeLeft, (timeLeft * 2) / 3, (timeLeft * 1) / 3, 0]}
                        >
                            {renderTime}
                        </CountdownCircleTimer>
                    </div>
                    <div className="flex justify-center py-4 px-4 font-bold text-2xl text-red-600">
                        The most previous winner: {recentWinner}
                    </div>
                </div>
            ) : (
                <div>Please connect to a supported chain</div>
            )}
        </div>
    )
}
