<script setup lang="ts">
import type { Profile, MentorAssignment } from '#shared/types/models'

type ActiveTab = 'users' | 'assignments'

const activeTab = ref<ActiveTab>('users')

// --- ユーザー管理 ---
const users = ref<Profile[]>([])
// TODO: profiles テーブルから全ユーザーを取得して users に格納する
// TODO: 「＋ ユーザーを追加」モーダルの open/close 制御を実装する

// --- メンター割り当て ---
const selectedYear = ref(new Date().getFullYear())
const assignments = ref<MentorAssignment[]>([])
// TODO: mentor_assignments テーブルから selectedYear の割り当てを取得して assignments に格納する
// TODO: profiles テーブルから role='mentor' のユーザーを取得する（割り当てドロップダウン用）
// TODO: profiles テーブルから role='ojt' のユーザーを取得する（割り当てドロップダウン用）
// TODO: 「保存」ボタンで割り当て内容を mentor_assignments に UPSERT する
</script>

<template>
  <div>
    <!-- タブ切り替え -->
    <div>
      <button @click="activeTab = 'users'">
        ユーザー管理
      </button>
      <button @click="activeTab = 'assignments'">
        メンター割り当て
      </button>
    </div>

    <!-- タブ①: ユーザー管理 -->
    <div v-if="activeTab === 'users'">
      <div>
        <button>
          <!-- TODO: ユーザー追加モーダルを開く -->
          ＋ ユーザーを追加
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>社員ID</th>
            <th>名前</th>
            <th>メール</th>
            <th>役割</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
          >
            <td>{{ u.employee_id }}</td>
            <td>{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td>
              <!-- TODO: 役割変更ドロップダウンを実装する（trainee/mentor/ojt/admin） -->
              {{ u.role }}
            </td>
            <td>
              <!-- TODO: 無効化ボタンを実装する（is_active を false に更新） -->
              <button>無効化</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- タブ②: メンター割り当て -->
    <div v-if="activeTab === 'assignments'">
      <div>
        <label>年度:</label>
        <select v-model="selectedYear">
          <!-- TODO: 年度の選択肢を動的に生成する -->
          <option :value="new Date().getFullYear()">
            {{ new Date().getFullYear() }}
          </option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>新人</th>
            <th>メンター</th>
            <th>OJT</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="a in assignments"
            :key="a.trainee_id"
          >
            <td>{{ a.trainee_id }}</td>
            <td>
              <!-- TODO: メンタードロップダウンを実装する -->
              {{ a.mentor_id ?? '未割り当て' }}
            </td>
            <td>
              <!-- TODO: OJTドロップダウンを実装する -->
              {{ a.ojt_id ?? '未割り当て' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div>
        <button>
          <!-- TODO: 割り当てを mentor_assignments に UPSERT する -->
          保存
        </button>
      </div>
    </div>

    <!-- TODO: ユーザー追加モーダルコンポーネントをここに配置する -->
  </div>
</template>
