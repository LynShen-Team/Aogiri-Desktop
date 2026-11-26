// The app's sounds (src/lib/sounds): the settings block and the names of the events.
const sounds = {
	zh: {
		title: '提示音',
		master: '播放提示音',
		masterHint: '任务完成、需要你确认、出错时提醒你。正在看的会话不响。',
		volume: '音量',
		preview: '试听',
		quietFocused: '窗口在后台时',
		event: {
			done: '任务完成',
			attention: '需要你确认',
			error: '出错',
			message: '收到消息',
			background: '后台任务完成',
			connected: '重新连上引擎',
			disconnected: '和引擎断开',
			sent: '发送消息',
			copied: '复制',
			egg: '赛博鸡蛋开包'
		}
	},
	en: {
		title: 'Sounds',
		master: 'Play sounds',
		masterHint: 'When a task finishes, needs you, or fails. Not for the conversation you are looking at.',
		volume: 'Volume',
		preview: 'Play',
		quietFocused: 'While the window is in the background',
		event: {
			done: 'Task finished',
			attention: 'Needs you',
			error: 'Error',
			message: 'Message received',
			background: 'Background task finished',
			connected: 'Engine reconnected',
			disconnected: 'Engine disconnected',
			sent: 'Message sent',
			copied: 'Copied',
			egg: 'Cyber egg packs'
		}
	}
};
export default sounds;
