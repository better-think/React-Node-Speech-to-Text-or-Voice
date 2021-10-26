import React, { Component } from 'react';
import { Container } from 'reactstrap';
import './custom.css'
import { 
    SpeechSynthesizer, 
    TranslationRecognizer, 
    SpeechTranslationConfig, 
    AudioConfig,
    ResultReason 
} from 'microsoft-cognitiveservices-speech-sdk';
import * as speechsdk from  'microsoft-cognitiveservices-speech-sdk';


import { getTokenOrRefresh } from './token_util';
import Socket from './socket';


export default class App extends Component {
    socket;
    recognizer;

    state = {
        displayText: '',
        recognizer: null,
        isRecognizing: false,
        languagesInRoom: [
        ],
        roomName: "",
        myName: "Robbie"
    }
    constructor(props) {
        super(props);

        this.state = {
            displayText: 'INITIALIZED: ready to test speech...',
            recognizer: null,
            isRecognizing: false,
            languagesInRoom: [
                "fr",
                "de"
            ],
            roomName: "12345",
            myLanguage: 'en',
            conversations: [],
            myName: "Robbie"
        }
    }
    
    async componentDidMount() {
        // check for valid speech key/region
        const tokenRes = await getTokenOrRefresh();
        if (tokenRes.authToken === null) {
            this.setState({
                displayText: 'FATAL_ERROR: ' + tokenRes.error
            });
        }

        this.socket = new Socket();
        let roomName = this.state.roomName;
        this.socket.join2room(this.state.roomName, function (err) {
            if(err) {
                console.error("join2room: ", err)
            }
            console.log(`Joined room ${roomName}`)
        });

        this.socket.on_conversation((conversation) => {
            console.log("conversation from server: ", conversation)
            let user = conversation.owner;
            let translations = conversation.translations;

            let conversations = this.state.conversations.filter((value) => {
                return value.user !== user
            });

            let se = conversation.translations[this.state.myLanguage] || ""

            console.log("conversation: ", se)

            this.textToSpeech(se);

            this.setState({
                conversations: [...conversations, {user, translations}]
            }, () =>{
                console.log(this.state.conversations)
            })
        })
    }
    
    // has no feature for multiple transalate
    async continuesSpeechToText () {
        const tokenObj = await getTokenOrRefresh();
        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechConfig.speechRecognitionLanguage = 'en-US';
        // speechConfig.enableDictation();

        const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();

        const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);


        recognizer.recognizing = (s, e) => {
            console.log(`RECOGNIZING: Text=${e.result.text}`);
            // this.textToSpeech(e.result.text);
        };
        
        recognizer.recognized = (s, e) => {
            if (e.result.reason == speechsdk.ResultReason.RecognizedSpeech) {
                console.log(`RECOGNIZED: Text=${e.result.text}`);
            }
            else if (e.result.reason == speechsdk.ResultReason.NoMatch) {
                console.log("NOMATCH: Speech could not be recognized.");
            }
        };

        recognizer.canceled = (s, e) => {
            console.log(`CANCELED: Reason=${e.reason}`);
        
            if (e.reason == speechsdk.CancellationReason.Error) {
                console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
                console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
                console.log("CANCELED: Did you update the key and location/region info?");
            }
        
            recognizer.stopContinuousRecognitionAsync();
        };
        
        recognizer.sessionStopped = (s, e) => {
            console.log("\n    Session stopped event.");
            recognizer.stopContinuousRecognitionAsync();
        };

        recognizer.startContinuousRecognitionAsync((err) => {
            if(err) {
                console.error("startContinuousRecognitionAsync: ", err)
            }
        });
    }

    // has featuer for multiple language
    async continuesSpeechToText_Multi () {
        if(typeof this.recognizer !== 'undefined') {
            console.error("stopContinuousRecognitionAsync ----------- ")
            this.recognizer.stopContinuousRecognitionAsync();
        }
        console.log("running continuesSpeechToSpeech....")

        const tokenObj = await getTokenOrRefresh();
        // const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        const speechTranslationConfig = SpeechTranslationConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        speechTranslationConfig.speechRecognitionLanguage = "en-US";

        // add languages in the room
        speechTranslationConfig.addTargetLanguage(this.state.myLanguage);
        this.state.languagesInRoom.forEach((language, index) => {
            speechTranslationConfig.addTargetLanguage(language);
        }) 

        const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new TranslationRecognizer(speechTranslationConfig, audioConfig);

        recognizer.recognizing = (s, e) => {
            console.log(`TRANSLATING: Text=${e.result.text}`);
        };

        recognizer.recognized = (s, e) => {

            console.log("e.result.reason: ", e.result.reason)
            console.log(e.result.reason != ResultReason.NoMatch);

            if(e.result.reason != ResultReason.NoMatch) {
                let conversationResult = {
                    owner: this.state.myName,
                    resultReason: e.result.reason,
                    translations: {}
                };
                
                this.state.languagesInRoom.forEach((lang) => {
                    conversationResult.translations[lang] = e.result.translations.get(lang)
                })
                conversationResult.translations[this.state.myLanguage] = e.result.translations.get(this.state.myLanguage)

                console.log("sending converstation...", conversationResult)
                // send conversation to users in the room
                this.socket.send_conversation(conversationResult, this.state.roomName, function (err) {
                    if(err) {
                        console.error("send_conversation: ", err)
                    }

                    console.log("sent_conversation")
                })
            } else {
                console.log("Didnt recognized");
            }

        };

        recognizer.canceled = (s, e) => {
            console.log(`CANCELED: Reason=${e.reason}`);
            if (e.reason == "CancellationReason.Error") {
                console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
                console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
                console.log("CANCELED: Did you update the subscription info?");
            }
            recognizer.stopContinuousRecognitionAsync();
        };

        recognizer.sessionStopped = (s, e) => {
            console.log("\n    Session stopped event.");
            recognizer.stopContinuousRecognitionAsync();
        };


        recognizer.startContinuousRecognitionAsync((err) => {
            if(err) {
                console.error("startContinuousRecognitionAsync: ", err)
            }
        });
        this.recognizer = recognizer
    }

    /**
     * @param {String} text 
     */
    textToSpeech = async(text) => {
        const tokenObj = await getTokenOrRefresh();

        const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
        const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
        // speechConfig.speechRecognitionLanguage = 'en-US';


        speechConfig.speechSynthesisLanguage = "zh-CN"; // e.g. "de-DE"
        // The voice setting will overwrite language setting.
        // The voice setting will not overwrite the voice element in input SSML.
        speechConfig.speechSynthesisVoiceName = "zh-CN-XiaohanNeural";


    
        const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
        synthesizer.speakTextAsync(
            text || "Please input text",
            result => {
                if (result) {
                    synthesizer.close();
                    return result.audioData;
                }
            },
            error => {
                console.log(error);
                synthesizer.close();
            });
    }

    /**
     * 
     * @returns String
     */
    displayText = () => {
        const converstation = this.state.conversations.find((conversation) => {
            return conversation.user === this.state.myName
        })
        if(converstation) {
            return converstation.translations[this.state.myLanguage]
        }
        return "Watting..."
    }

    render() {
        return (
            <Container className="app-container">
                <h1 className="display-4 mb-3">Speech sample app</h1>

                <div className="row main-container">
                    <div className="col-6">
                        <i className="fas fa-microphone fa-lg mr-2" onClick={() => this.continuesSpeechToText()}></i>
                        Convert speech to text from your mic.

                        <div className="mt-2">
                            <i className="fas fa-microphone fa-lg mr-2" onClick={() => this.continuesSpeechToText_Multi()}></i>
                            Convert speech to text in multiple language.
                        </div>
                        {/* <div className="mt-2">
                            <label htmlFor="audio-file"><i className="fas fa-file-audio fa-lg mr-2"></i></label>
                            <input 
                                type="file" 
                                id="audio-file" 
                                onChange={(e) => this.fileChange(e)} 
                                style={{display: "none"}} 
                            />
                            Convert speech to text from an audio file.
                        </div> */}
                    </div>
                    <div className="col-6 output-display rounded">
                        <code>
                            {
                                this.displayText()
                            }
                        </code>
                    </div>
                </div>
            </Container>
        );
    }
}
