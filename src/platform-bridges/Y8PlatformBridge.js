import PlatformBridgeBase from './PlatformBridgeBase'
import { addJavaScript, waitFor } from '../common/utils'
import {
    PLATFORM_ID,
    ACTION_NAME, ERROR,
} from '../constants'

const SDK_URL = 'https://cdn.y8.com/api/sdk.js'

class Y8PlatformBridge extends PlatformBridgeBase {
    constructor(options) {
        super(options)
        this._isPlayerAuthorized = false
    }

    // platform
    get platformId() {
        return PLATFORM_ID.Y8
    }

    initialize() {
        if (this._isInitialized) {
            return Promise.resolve()
        }
        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.INITIALIZE)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.INITIALIZE)

            addJavaScript(SDK_URL).then(() => {
                waitFor('ID', 'init').then(() => {
                    this._platformSdk = window.ID
                    if (!this._options || typeof this._options.gameId !== 'string') {
                        this._rejectPromiseDecorator(
                            ACTION_NAME.INITIALIZE,
                            ERROR.GAME_DISTRIBUTION_GAME_ID_IS_UNDEFINED,
                        )
                    } else {
                        this._platformSdk.Event.subscribe('id.init', () => {
                            this._platformSdk.getLoginStatus((data) => {
                                this._isInitialized = true
                                this._resolvePromiseDecorator(ACTION_NAME.INITIALIZE)

                                if (data.status === 'not_linked' || data.status === 'uncomplete') {
                                    this._platformSdk.login()
                                }
                            })
                        })

                        this._platformSdk.Event.subscribe('auth.authResponseChange', (auth) => {
                            this._onAuthorizationChanged(auth)
                        });

                        this._platformSdk.init({
                            appId: this._options.gameId,
                        })
                    }
                })
            })
        }

        return promiseDecorator.promise
    }

    _onAuthorizationChanged(data) {
        const { status, authResponse } = data
        if (status === 'ok') {
            const { details: { pid, nickname, avatars } } = authResponse
            this._isPlayerAuthorized = true
            this._playerName = nickname
            this._playerId = pid
            this._playerPhotos = [avatars.large_url, avatars.medium_url, avatars.thumb_url].filter(Boolean)
        } else {
            this._isPlayerAuthorized = false
            this._playerName = null
            this._playerId = null
            this._playerPhotos = []
        }
    }

    get isPlayerAuthorizationSupported() {
        return true
    }

    get isPlayerAuthorized() {
        return this._isPlayerAuthorized
    }

    // player
    authorizePlayer() {
        if (this._isPlayerAuthorized) {
            return Promise.resolve()
        }

        let promiseDecorator = this._getPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
        if (!promiseDecorator) {
            promiseDecorator = this._createPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
            this._platformSdk.login(({ status }) => {
                if (status === 'ok') {
                    this._resolvePromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER)
                } else {
                    this._rejectPromiseDecorator(ACTION_NAME.AUTHORIZE_PLAYER, status) // replace with proper error
                }
            })
        }

        return promiseDecorator.promise
    }
}

export default Y8PlatformBridge
