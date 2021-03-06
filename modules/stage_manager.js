const MODULE_NAME = 'Stage Manager'

class StageManager {
  constructor (moduleManager) {
    this._client = moduleManager.getClient()
    this._guild = moduleManager.getGuild()
    this._config = moduleManager.getConfig()

    this.processConfig()
  }

  processConfig () {
    if (this._config.get('recitalManagerRoleId') == null) {
      throw new Error('enableStageManager is true, but no recital manager role was specified.')
    }

    this._recital_manager = this._guild.roles.resolve(this._config.get('recitalManagerRoleId'))
    if (this._recital_manager == null) {
      throw new Error('enableStageManager does not refer to a valid role.')
    }

    if (this._config.get('performerRoleId') == null) {
      throw new Error('enableStageManager is true, but no performer role was specified.')
    }

    this._performer = this._guild.roles.resolve(this._config.get('performerRoleId'))
    if (this._performer == null) {
      throw new Error('performerRoleId does not refer to a valid role.')
    }

    if (this._config.get('controlChannelId') == null) {
      throw new Error('enableStageManager is true, but no control channel was specified.')
    }

    this._controlChannel = this._guild.channels.resolve(this._config.get('controlChannelId'))
    if (this._controlChannel == null) {
      throw new Error('controlChannelId does not refer to a valid channel.')
    }

    if (this._config.get('textChannelId') == null) {
      throw new Error('enableStageManager is true, but no text channel was specified.')
    }

    this._textChannel = this._guild.channels.resolve(this._config.get('textChannelId'))
    if (this._textChannel == null) {
      throw new Error('textChannelId does not refer to a valid channel.')
    }

    if (this._config.get('voiceChannelId') == null) {
      throw new Error('enableStageManager is true, but no voice channel was specified.')
    }

    this._voiceChannel = this._guild.channels.resolve(this._config.get('voiceChannelId'))
    if (this._voiceChannel == null) {
      throw new Error('voiceChannelId does not refer to a valid channel.')
    }

    if (this._config.get('programChannelId') == null) {
      throw new Error('enableStageManager is true, but no program channel was specified.')
    }

    this._programChannel = this._guild.channels.resolve(this._config.get('programChannelId'))
    if (this._programChannel == null) {
      throw new Error('programChannelId does not refer to a valid channel.')
    }
  }

  async resume () {
    const content =
      '***__STAGE PRESETS__***\n\n' +
      ':lock: `LOCKED` All channels hidden\n\n' +
      ':unlock: `UNLOCKED` Recital Hall **open**, chat channel **visible but closed**, programme channel **visible**\n\n' +
      ':musical_note: `PERFORMANCE` Recital Hall **open**, chat channel **open**, programme channel **visible**\n\n' +
      ':pencil: `PROGRAMME EDIT` Programme channel **limited visibility**, all other channels hidden\n\n' +
      ':notebook_with_decorative_cover: `PROGRAMME DISPLAY` Programme channel **visible to Performers**, all other channels hidden\n\n' +
      ':apple: `LECTURE` Lecture Hall **open**, chat channel **open**, programme channel **hidden**\n_ _'
    const messages = await this._controlChannel.messages.fetch()
    let controlPost = messages.find(m => m.author === this._client.user)
    if (controlPost == null) {
      controlPost = await this._controlChannel.send(content)
    } else {
      controlPost.edit(content)
    }

    const reactionCollector = controlPost.createReactionCollector((r, u) => u !== this._client.user)
    reactionCollector.on('collect', reaction => this._handleReaction(reaction))

    controlPost.react('🔒')
    controlPost.react('🔓')
    controlPost.react('🎵')
    controlPost.react('📝')
    controlPost.react('📔')
    controlPost.react('🍎')
  }

  _handleReaction (reaction) {
    const reactor = reaction.users.cache.find(user => user !== this._client.user)
    if (reactor == null) {
      return
    }

    if (reaction.emoji.name === '🔒') {
      this._setLockedPreset()
    } else if (reaction.emoji.name === '🔓') {
      this._setUnlockedPreset()
    } else if (reaction.emoji.name === '🎵') {
      this._setPerformancePreset()
    } else if (reaction.emoji.name === '📝') {
      this._setProgrammeEditPreset()
    } else if (reaction.emoji.name === '📔') {
      this._setProgrammeDisplayPreset()
    } else if (reaction.emoji.name === '🍎') {
      this._setLecturePreset()
    }

    reaction.users.remove(reactor)
  }

  _setLockedPreset () {
    this._textChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false, SEND_MESSAGES: false })
    this._voiceChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._recital_manager, { VIEW_CHANNEL: null })
    this._programChannel.updateOverwrite(this._performer, { VIEW_CHANNEL: null })

    this._setPerformanceChannelNames()
  }

  _setUnlockedPreset () {
    this._setPerformanceChannelNames()

    this._textChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: false })
    this._voiceChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._recital_manager, { VIEW_CHANNEL: null })
    this._programChannel.updateOverwrite(this._performer, { VIEW_CHANNEL: null })
  }

  _setPerformancePreset () {
    this._setPerformanceChannelNames()

    this._textChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: true })
    this._voiceChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._recital_manager, { VIEW_CHANNEL: null })
    this._programChannel.updateOverwrite(this._performer, { VIEW_CHANNEL: null })
  }

  _setProgrammeEditPreset () {
    this._setPerformanceChannelNames()

    this._textChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false, SEND_MESSAGES: false })
    this._voiceChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._recital_manager, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._performer, { VIEW_CHANNEL: null })
  }

  _setProgrammeDisplayPreset () {
    this._setPerformanceChannelNames()

    this._textChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false, SEND_MESSAGES: false })
    this._voiceChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._recital_manager, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._performer, { VIEW_CHANNEL: true })
  }

  _setLecturePreset () {
    this._setLectureChannelNames()

    this._textChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true, SEND_MESSAGES: true })
    this._voiceChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: true })
    this._programChannel.updateOverwrite(this._guild.id, { VIEW_CHANNEL: false })
    this._programChannel.updateOverwrite(this._recital_manager, { VIEW_CHANNEL: null })
    this._programChannel.updateOverwrite(this._performer, { VIEW_CHANNEL: null })
  }

  _setPerformanceChannelNames () {
    if (this._textChannel.name !== this._config.get('performanceTextChannelName')) {
      this._textChannel.setName(this._config.get('performanceTextChannelName'))
    }

    if (this._voiceChannel.name !== this._config.get('performanceVoiceChannelName')) {
      this._voiceChannel.setName(this._config.get('performanceVoiceChannelName'))
    }
  }

  _setLectureChannelNames () {
    if (this._textChannel.name !== this._config.get('lectureTextChannelName')) {
      this._textChannel.setName(this._config.get('lectureTextChannelName'))
    }

    if (this._voiceChannel.name !== this._config.get('lectureVoiceChannelName')) {
      this._voiceChannel.setName(this._config.get('lectureVoiceChannelName'))
    }
  }
}

function makeModule (moduleManager) {
  if (!moduleManager.getConfig().get('enableStageManager')) return
  return new StageManager(moduleManager)
}

module.exports = { name: MODULE_NAME, makeModule: makeModule }
